import argparse
import sys

from graph_builder import build_graph_bundle_from_manifest, export_graphs
from pipeline_state import load_articles, load_manifest, save_manifest, sync_manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Build canonical graph layers from per-article extracted artifacts")
    parser.add_argument("--allow-partial", action="store_true", help="Allow graph export when some articles are still pending")
    args = parser.parse_args()

    manifest = sync_manifest(load_manifest(), load_articles())
    save_manifest(manifest)
    full_graph, canonical_graph, summary = build_graph_bundle_from_manifest(manifest, allow_partial=args.allow_partial)
    if full_graph is None or canonical_graph is None:
        print("Graph export skipped: some active articles are not ready yet.")
        print(f"Ready articles: {summary['ready_count']}")
        print(f"Missing articles: {summary['missing_count']}")
        if summary["missing_article_ids"]:
            print("First missing IDs:", ", ".join(summary["missing_article_ids"][:10]))
        sys.exit(1)

    export_graphs(full_graph, canonical_graph)

    print(
        "Saved "
        f"{len(full_graph['nodes'])} full nodes / {len(full_graph['links'])} full links / "
        f"{len(canonical_graph['nodes'])} canonical nodes / {len(canonical_graph['links'])} canonical links"
    )
    if canonical_graph["metadata"].get("isPartial"):
        print("Exported partial graph because --allow-partial was enabled.")


if __name__ == "__main__":
    main()
