from __future__ import annotations

import argparse
import asyncio
import json
import time
from collections import Counter
from pathlib import Path
from types import SimpleNamespace

from extract_gemini import load_project_env, main_async as extract_main_async
from graph_builder import build_graph_bundle_from_manifest, export_graphs
from pipeline_state import (
    PROJECT_ROOT,
    active_article_entries,
    load_articles,
    load_manifest,
    missing_article_ids,
    save_json_file,
    save_manifest,
    sync_manifest,
    utc_now,
)

RUN_STATE_FILE = PROJECT_ROOT / "data" / "state" / "nightly_run_state.json"


def manifest_status_counts(manifest: dict) -> dict[str, int]:
    counts = Counter(entry.get("status", "unknown") for entry in active_article_entries(manifest).values())
    return dict(sorted(counts.items()))


def outstanding_ids(manifest: dict) -> list[str]:
    return missing_article_ids(manifest)


def active_ids(manifest: dict) -> list[str]:
    return sorted(active_article_entries(manifest))


def save_run_state(payload: dict) -> None:
    save_json_file(RUN_STATE_FILE, payload)


async def run_batch(article_ids: list[str], workers: int, force: bool) -> int:
    args = SimpleNamespace(
        limit=None,
        workers=workers,
        articles=article_ids,
        force=force,
        allow_partial_export=False,
    )
    return await extract_main_async(args)


async def main_async(args) -> int:
    load_project_env(PROJECT_ROOT / ".env")

    all_articles = load_articles()
    manifest = sync_manifest(load_manifest(), all_articles)
    save_manifest(manifest)

    queue_ids = active_ids(manifest) if args.force else outstanding_ids(manifest)

    run_state = {
        "startedAt": utc_now(),
        "updatedAt": utc_now(),
        "config": {
            "batchSize": args.batch_size,
            "initialWorkers": args.initial_workers,
            "maxWorkers": args.max_workers,
            "scaleUpAfterCleanRounds": args.scale_up_after_clean_rounds,
            "cooldownSeconds": args.cooldown_seconds,
            "maxRounds": args.max_rounds,
            "force": bool(args.force),
        },
        "rounds": [],
        "status": {
            "counts": manifest_status_counts(manifest),
            "outstandingArticleIds": queue_ids,
        },
    }
    save_run_state(run_state)

    if not queue_ids:
        print("All active articles are already ready. Building graph...")

    workers = max(1, min(args.initial_workers, args.max_workers))
    clean_rounds = 0

    for round_index in range(1, args.max_rounds + 1):
        manifest = sync_manifest(load_manifest(), load_articles())
        save_manifest(manifest)
        pending_ids = list(queue_ids if args.force else outstanding_ids(manifest))
        if not pending_ids:
            break

        batch_ids = pending_ids[: args.batch_size]
        round_start = time.time()
        print(
            f"\n=== Round {round_index} | workers={workers} | batch={len(batch_ids)} | outstanding={len(pending_ids)} ===",
            flush=True,
        )
        print("Batch IDs:", " ".join(batch_ids), flush=True)

        await run_batch(batch_ids, workers, args.force)

        manifest = load_manifest()
        counts = manifest_status_counts(manifest)
        ready_ids = [
            article_id
            for article_id in batch_ids
            if manifest["articles"].get(article_id, {}).get("status") == "ready"
        ]
        failed_ids = [article_id for article_id in batch_ids if article_id not in ready_ids]
        duration = round(time.time() - round_start, 1)

        round_state = {
            "round": round_index,
            "startedAt": utc_now(),
            "workers": workers,
            "batchArticleIds": batch_ids,
            "readyArticleIds": ready_ids,
            "failedArticleIds": failed_ids,
            "durationSeconds": duration,
            "manifestCounts": counts,
        }
        run_state["rounds"].append(round_state)
        run_state["updatedAt"] = utc_now()

        if args.force:
            queue_ids = pending_ids[args.batch_size:] + failed_ids
            outstanding = queue_ids
        else:
            outstanding = outstanding_ids(manifest)

        run_state["status"] = {
            "counts": counts,
            "outstandingArticleIds": outstanding,
        }
        save_run_state(run_state)

        if failed_ids:
            clean_rounds = 0
            if workers > 1:
                workers -= 1
            if args.cooldown_seconds > 0:
                print(f"Cooldown {args.cooldown_seconds}s before retrying failed/outstanding articles...", flush=True)
                await asyncio.sleep(args.cooldown_seconds)
        else:
            clean_rounds += 1
            if clean_rounds >= args.scale_up_after_clean_rounds and workers < args.max_workers:
                workers += 1
                clean_rounds = 0

    manifest = sync_manifest(load_manifest(), load_articles())
    save_manifest(manifest)
    remaining_ids = queue_ids if args.force else outstanding_ids(manifest)

    if remaining_ids:
        run_state["updatedAt"] = utc_now()
        run_state["finishedAt"] = utc_now()
        run_state["result"] = {
            "success": False,
            "reason": "max_rounds_reached",
            "remainingArticleIds": remaining_ids,
            "counts": manifest_status_counts(manifest),
        }
        save_run_state(run_state)
        print("\nRun stopped before all active articles were ready.")
        print("Remaining IDs:", " ".join(remaining_ids))
        return 1

    full_graph, canonical_graph, summary = build_graph_bundle_from_manifest(manifest, allow_partial=False)
    if full_graph is None or canonical_graph is None:
        print("\nGraph build unexpectedly skipped.")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 1

    export_graphs(full_graph, canonical_graph)

    run_state["updatedAt"] = utc_now()
    run_state["finishedAt"] = utc_now()
    run_state["result"] = {
        "success": True,
        "counts": manifest_status_counts(manifest),
        "graph": {
            "fullNodes": len(full_graph["nodes"]),
            "fullLinks": len(full_graph["links"]),
            "nodes": len(canonical_graph["nodes"]),
            "links": len(canonical_graph["links"]),
        },
    }
    save_run_state(run_state)

    print("\nFull extraction run completed.")
    print(
        "Graph exported: "
        f"{len(full_graph['nodes'])} full nodes / {len(full_graph['links'])} full links / "
        f"{len(canonical_graph['nodes'])} canonical nodes / {len(canonical_graph['links'])} canonical links"
    )
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Run unattended full extraction rounds until all active articles are ready")
    parser.add_argument("--batch-size", type=int, default=6, help="How many articles to process per round")
    parser.add_argument("--initial-workers", type=int, default=2, help="Initial concurrent Gemini requests")
    parser.add_argument("--max-workers", type=int, default=2, help="Upper bound for concurrent Gemini requests")
    parser.add_argument(
        "--scale-up-after-clean-rounds",
        type=int,
        default=2,
        help="Increase workers after N consecutive rounds with zero failures",
    )
    parser.add_argument("--cooldown-seconds", type=int, default=8, help="Wait time after a round with failures")
    parser.add_argument("--max-rounds", type=int, default=30, help="Safety cap for unattended rounds")
    parser.add_argument("--force", action="store_true", help="Force re-extraction of all active articles, not just missing ones")
    args = parser.parse_args()

    raise SystemExit(asyncio.run(main_async(args)))


if __name__ == "__main__":
    main()
