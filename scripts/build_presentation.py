#!/usr/bin/env python3
"""
build_presentation.py -- Generate frontend data from the corrected graph.

Reads data/graph/canonical_corrected.json (output of post_process.py)
and generates:
  - web-data/graph-view.json       (full graph data for frontend)
  - web-data/leaderboards.json     (4 category leaderboards)
  - web-data/article-index.json    (article index, copied from existing if available)
  - data/config/display_registry.json (updated leaderboard segments)

Usage:
    python scripts/build_presentation.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Allow importing sibling modules when run as script
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from graph_utils import RELATION_STRENGTH, DEFAULT_RELATION_STRENGTH

PROJECT_ROOT = SCRIPT_DIR.parent
CORRECTED_PATH = PROJECT_ROOT / "data" / "graph" / "canonical_corrected.json"
WEB_DATA_DIR = PROJECT_ROOT / "web-data"
GRAPH_VIEW_PATH = WEB_DATA_DIR / "graph-view.json"
LEADERBOARD_PATH = WEB_DATA_DIR / "leaderboards.json"
ARTICLE_INDEX_PATH = WEB_DATA_DIR / "article-index.json"
DISPLAY_REGISTRY_PATH = PROJECT_ROOT / "data" / "config" / "display_registry.json"

# Existing article index (if any) -- we copy it as-is
EXISTING_ARTICLE_INDEX = PROJECT_ROOT / "data" / "article-index.json"


# ── JSON helpers ──────────────────────────────────────────────────────

def load_json(path: Path) -> dict | list | None:
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved: {path}")


# ── Graph View ────────────────────────────────────────────────────────

def build_graph_view(data: dict) -> dict:
    """Build the graph-view.json for the frontend.
    Preserves all node and link fields from the corrected graph."""
    nodes = data.get("nodes", [])
    links = data.get("links", [])
    metadata = dict(data.get("metadata", {}))

    # Ensure all nodes have required fields
    for n in nodes:
        n.setdefault("degree", 0)
        n.setdefault("composite_weight", 0)
        n.setdefault("mention_count", 0)
        n.setdefault("article_count", 0)
        n.setdefault("aliases", [])
        n.setdefault("tags", [])
        n.setdefault("references", n.get("article_count", 0))
        n.setdefault("description", "")

    # Ensure all links have required fields
    for link in links:
        link.setdefault("type", link.get("relation_type", "related"))
        link.setdefault("label", link.get("relation_type", "related"))
        link.setdefault("weight", 1)
        strength = RELATION_STRENGTH.get(
            link.get("relation_type", "related"),
            DEFAULT_RELATION_STRENGTH,
        )
        link.setdefault("strength", strength)
        link.setdefault("effective_weight", strength * link.get("weight", 1))
        link.setdefault("article_count", 0)
        link.setdefault("evidence_articles", [])

    # Update metadata
    metadata["source"] = "canonical_corrected"
    metadata["generatedAt"] = datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    return {
        "nodes": nodes,
        "links": links,
        "metadata": metadata,
    }


# ── Leaderboards ─────────────────────────────────────────────────────

def build_leaderboards(data: dict) -> dict:
    """Build the 4-category leaderboard from graph data."""
    nodes = data.get("nodes", [])
    links = data.get("links", [])
    nmap = {n["id"]: n for n in nodes}

    # Determine which persons have founder_of/co_founded edges
    founder_persons: set[str] = set()
    for link in links:
        if link.get("relation_type") in ("founder_of", "co_founded"):
            src_node = nmap.get(link["source"])
            if src_node and src_node.get("type") == "person":
                founder_persons.add(link["source"])

    # Products: type=product, sorted by composite_weight, top 20
    products = sorted(
        [n for n in nodes if n.get("type") == "product"],
        key=lambda n: n.get("composite_weight", 0),
        reverse=True,
    )[:20]

    # Founders: type=person with founder_of/co_founded edges, top 20
    founders = sorted(
        [n for n in nodes
         if n.get("type") == "person" and n["id"] in founder_persons],
        key=lambda n: n.get("composite_weight", 0),
        reverse=True,
    )[:20]

    # VCs: type=vc_firm, all
    vcs = sorted(
        [n for n in nodes if n.get("type") == "vc_firm"],
        key=lambda n: n.get("composite_weight", 0),
        reverse=True,
    )

    # Companies: type=company, top 20
    companies = sorted(
        [n for n in nodes if n.get("type") == "company"],
        key=lambda n: n.get("composite_weight", 0),
        reverse=True,
    )[:20]

    def make_entry(rank: int, n: dict) -> dict:
        desc = n.get("description", "")
        return {
            "rank": rank,
            "nodeId": n["id"],
            "name": n.get("name", n["id"]),
            "displayName": n.get("displayName", n.get("name", n["id"])),
            "type": n.get("type", ""),
            "degree": n.get("degree", 0),
            "mention_count": n.get("mention_count", 0),
            "article_count": n.get("article_count", 0),
            "composite_weight": n.get("composite_weight", 0),
            "description": desc[:50] if desc else "",
            "visualMode": n.get("visualMode", "text"),
            "asset": n.get("asset", None),
            "featured": n.get("featured", False),
            "leaderboardSegments": [],
        }

    segments = {
        "products": [make_entry(i + 1, n) for i, n in enumerate(products)],
        "founders": [make_entry(i + 1, n) for i, n in enumerate(founders)],
        "vcs": [make_entry(i + 1, n) for i, n in enumerate(vcs)],
        "companies": [make_entry(i + 1, n) for i, n in enumerate(companies)],
    }

    # Build reverse mapping: nodeId -> list of segments
    node_segments: dict[str, list[str]] = defaultdict(list)
    for seg_name, entries in segments.items():
        for e in entries:
            node_segments[e["nodeId"]].append(seg_name)

    # Fill leaderboardSegments
    for seg_name, entries in segments.items():
        for e in entries:
            e["leaderboardSegments"] = node_segments[e["nodeId"]]

    leaderboards = {
        "generatedAt": datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
        "segments": segments,
    }

    return leaderboards, node_segments


# ── Display Registry ──────────────────────────────────────────────────

def update_display_registry(node_segments: dict[str, list[str]]) -> None:
    """Update the display_registry.json with leaderboard segments."""
    print("\n  -- Update display_registry.json --")

    if not DISPLAY_REGISTRY_PATH.exists():
        print(f"  WARNING: {DISPLAY_REGISTRY_PATH} not found, creating new.")
        dr = {"nodes": []}
    else:
        dr = load_json(DISPLAY_REGISTRY_PATH)

    # Remove sizeBoost from all entries
    for nc in dr.get("nodes", []):
        nc.pop("sizeBoost", None)

    # Build set of existing registry nodeIds
    registry_ids = {nc["nodeId"] for nc in dr.get("nodes", [])}

    # Update leaderboardSegments for existing entries
    for nc in dr.get("nodes", []):
        nid = nc["nodeId"]
        if nid in node_segments:
            nc["leaderboardSegments"] = node_segments[nid]

    # Add entries for leaderboard nodes not yet in registry
    for nid, segs in node_segments.items():
        if nid not in registry_ids:
            dr["nodes"].append({
                "nodeId": nid,
                "visualMode": "text",
                "featured": False,
                "leaderboardSegments": segs,
            })
            registry_ids.add(nid)

    save_json(DISPLAY_REGISTRY_PATH, dr)
    print(f"  Display registry: {len(dr['nodes'])} entries "
          f"(sizeBoost removed)")


# ── Article Index ─────────────────────────────────────────────────────

def build_article_index(data: dict) -> list[dict] | None:
    """Build article index from source_articles across all nodes.
    If an existing article-index.json is found, copy it instead."""
    # Check existing article index files
    for candidate in [EXISTING_ARTICLE_INDEX, ARTICLE_INDEX_PATH]:
        if candidate.exists():
            existing = load_json(candidate)
            if existing:
                print(f"  Copying existing article index from {candidate}")
                return existing

    # Build from graph data -- extract unique articles from source_articles
    articles_by_id: dict[str, dict] = {}
    for node in data.get("nodes", []):
        for art in node.get("source_articles", []):
            aid = art.get("article_id", "")
            if aid and aid not in articles_by_id:
                articles_by_id[aid] = {
                    "id": aid,
                    "title": art.get("title", ""),
                    "date": art.get("date", ""),
                    "path": art.get("path", ""),
                    "permalink": art.get("permalink", f"/articles/{aid}"),
                }

    if not articles_by_id:
        print("  No articles found in graph data")
        return None

    articles = sorted(articles_by_id.values(), key=lambda a: a.get("id", ""))
    print(f"  Built article index with {len(articles)} articles from graph")
    return articles


# ── Main ──────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 70)
    print("build_presentation.py -- Generate frontend data")
    print("=" * 70)

    if not CORRECTED_PATH.exists():
        print(f"ERROR: {CORRECTED_PATH} not found.")
        print("Run post_process.py first to generate the corrected graph.")
        sys.exit(1)

    data = load_json(CORRECTED_PATH)
    print(f"\nLoaded: {len(data['nodes'])} nodes, {len(data['links'])} links")
    print(f"Node types: {dict(Counter(n['type'] for n in data['nodes']))}")
    print(f"Relation types: "
          f"{dict(Counter(l['relation_type'] for l in data['links']))}")

    # Ensure output directory exists
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Graph view
    print(f"\n{'=' * 70}")
    print("Generate graph-view.json")
    print("=" * 70)
    graph_view = build_graph_view(data)
    save_json(GRAPH_VIEW_PATH, graph_view)
    print(f"  Nodes: {len(graph_view['nodes'])}")
    print(f"  Links: {len(graph_view['links'])}")

    # 2. Leaderboards
    print(f"\n{'=' * 70}")
    print("Generate leaderboards.json")
    print("=" * 70)
    leaderboards, node_segments = build_leaderboards(data)
    save_json(LEADERBOARD_PATH, leaderboards)
    for seg_name, entries in leaderboards["segments"].items():
        print(f"  {seg_name}: {len(entries)} entries")
        for e in entries[:5]:
            print(f"    #{e['rank']} {e['name']} "
                  f"(cw={e['composite_weight']:.4f})")

    # 3. Article index
    print(f"\n{'=' * 70}")
    print("Generate article-index.json")
    print("=" * 70)
    article_list = build_article_index(data)
    if article_list is not None:
        # Ensure list format (unwrap if wrapped in dict)
        if isinstance(article_list, dict) and "articles" in article_list:
            raw_list = article_list["articles"]
        else:
            raw_list = article_list
        # Frontend expects { articles: [...], count: N } format
        from datetime import datetime, timezone
        article_index = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "count": len(raw_list),
            "isPartial": False,
            "missingArticleIds": [],
            "articles": raw_list,
        }
        save_json(ARTICLE_INDEX_PATH, article_index)
        print(f"  Articles: {len(raw_list)}")
    else:
        print("  Skipped (no article data available)")

    # 4. Display registry
    print(f"\n{'=' * 70}")
    print("Update display_registry.json")
    print("=" * 70)
    update_display_registry(node_segments)

    # ── Summary ──
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print("=" * 70)
    print(f"  graph-view.json:       {len(graph_view['nodes'])} nodes, "
          f"{len(graph_view['links'])} links")
    print(f"  leaderboards.json:     "
          f"{sum(len(v) for v in leaderboards['segments'].values())} entries "
          f"across {len(leaderboards['segments'])} segments")
    if article_list:
        print(f"  article-index.json:    {len(raw_list)} articles")
    print(f"\nOutput directory: {WEB_DATA_DIR}")
    print(f"Display registry: {DISPLAY_REGISTRY_PATH}")


if __name__ == "__main__":
    main()
