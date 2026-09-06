#!/usr/bin/env python3
"""
kg_review_gate.py -- Pre-deploy review gate for the knowledge graph.

The extractor can only infer relationships present in one article. This gate
keeps deployment honest by checking that extracted entities survive into the
frontend data and by surfacing cross-entity review candidates before publishing.

It is intentionally deterministic: it does not invent edges. When it reports
relationship candidates, review them and add confirmed facts to overrides.py.
"""

from __future__ import annotations

import argparse
import json
import sys
from itertools import combinations
from pathlib import Path
from typing import Any

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    tomllib = None

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from graph_utils import MERGE_MAP, sanitize_id
from overrides import EXCLUDED_ARTICLES, NODE_MERGES

PIPELINE_CONFIG = PROJECT_ROOT / "pipeline.toml"
GRAPH_VIEW_PATH = PROJECT_ROOT / "web-data" / "graph-view.json"
ARTICLE_INDEX_PATH = PROJECT_ROOT / "web-data" / "article-index.json"
ARTICLE_PAYLOAD_DIR = PROJECT_ROOT / "web-data" / "articles"
EXTRACTED_DIR = PROJECT_ROOT / "data" / "extracted"

DEFAULT_CONFIG = {
    "last_holistic_review_article": "000",
    "max_unreviewed_articles": 12,
    "recent_window_articles": 24,
    "candidate_pair_min_mentions": 3,
    "max_candidate_pairs_print": 20,
    "max_isolated_entities_print": 20,
}


def load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_config() -> dict[str, Any]:
    config = dict(DEFAULT_CONFIG)
    if PIPELINE_CONFIG.exists() and tomllib is not None:
        with open(PIPELINE_CONFIG, "rb") as f:
            payload = tomllib.load(f)
        config.update(payload.get("kg_review", {}))
    return config


def article_number(article_id: str) -> int:
    try:
        return int(article_id)
    except (TypeError, ValueError):
        return 0


def build_lookup(graph: dict[str, Any]) -> tuple[dict[str, dict], dict[str, str]]:
    id_to_node = {node["id"]: node for node in graph.get("nodes", [])}
    lookup: dict[str, str] = {}

    def register(value: object, node_id: str) -> None:
        raw = str(value or "").strip()
        if not raw:
            return
        lookup.setdefault(raw, node_id)
        lookup.setdefault(raw.casefold(), node_id)
        lookup.setdefault(sanitize_id(raw), node_id)

    for node in id_to_node.values():
        node_id = node["id"]
        register(node_id, node_id)
        register(node.get("name"), node_id)
        register(node.get("displayName"), node_id)
        for alias in node.get("aliases", []):
            register(alias, node_id)

    for merge in NODE_MERGES:
        keep = merge["keep"]
        if keep not in id_to_node:
            continue
        for removed in merge.get("remove", []):
            register(removed, keep)

    for canonical_name, aliases in MERGE_MAP.items():
        canonical_id = sanitize_id(canonical_name)
        if canonical_id not in id_to_node:
            continue
        for alias in aliases:
            register(alias, canonical_id)

    return id_to_node, lookup


def resolve_entity(value: object, lookup: dict[str, str]) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    return (
        lookup.get(raw)
        or lookup.get(raw.casefold())
        or lookup.get(sanitize_id(raw))
    )


def artifact_paths(article_ids: list[str]) -> list[Path]:
    selected = set(article_ids)
    return [
        EXTRACTED_DIR / f"{article_id}.json"
        for article_id in article_ids
        if article_id in selected and article_id not in EXCLUDED_ARTICLES
    ]


def payload_entity_ids(article_id: str) -> set[str]:
    path = ARTICLE_PAYLOAD_DIR / f"{article_id}.json"
    if not path.exists():
        return set()
    payload = load_json(path)
    return {entity["id"] for entity in payload.get("entities", [])}


def edge_key_set(graph: dict[str, Any]) -> set[tuple[str, str]]:
    keys = set()
    for link in graph.get("links", []):
        source = link.get("source")
        target = link.get("target")
        if source and target:
            keys.add((source, target))
            keys.add((target, source))
    return keys


def check_entity_survival(
    article_ids: list[str],
    lookup: dict[str, str],
) -> tuple[list[dict], list[dict]]:
    missing_from_graph: list[dict] = []
    missing_from_payload: list[dict] = []

    for path in artifact_paths(article_ids):
        if not path.exists():
            continue
        artifact = load_json(path)
        article = artifact.get("article", {})
        article_id = str(article.get("id", path.stem))
        payload_ids = payload_entity_ids(article_id)
        for entity in artifact.get("entities", []):
            resolved_id = (
                resolve_entity(entity.get("id"), lookup)
                or resolve_entity(entity.get("name"), lookup)
            )
            item = {
                "article_id": article_id,
                "title": article.get("title", ""),
                "entity": entity.get("name", entity.get("id")),
                "entity_id": entity.get("id"),
            }
            if not resolved_id:
                missing_from_graph.append(item)
                continue
            if resolved_id not in payload_ids:
                item["resolved_id"] = resolved_id
                missing_from_payload.append(item)

    return missing_from_graph, missing_from_payload


def candidate_pairs(
    article_ids: list[str],
    lookup: dict[str, str],
    graph_edges: set[tuple[str, str]],
    min_mentions: int,
) -> list[dict]:
    candidates: list[dict] = []

    for path in artifact_paths(article_ids):
        if not path.exists():
            continue
        artifact = load_json(path)
        article = artifact.get("article", {})
        resolved_entities = []
        for entity in artifact.get("entities", []):
            mentions = int(entity.get("mention_count", 0))
            if mentions < min_mentions:
                continue
            node_id = (
                resolve_entity(entity.get("id"), lookup)
                or resolve_entity(entity.get("name"), lookup)
            )
            if not node_id:
                continue
            resolved_entities.append({
                "id": node_id,
                "name": entity.get("name", node_id),
                "mention_count": mentions,
                "type": entity.get("type", ""),
            })

        seen_ids = set()
        unique_entities = []
        for entity in resolved_entities:
            if entity["id"] in seen_ids:
                continue
            seen_ids.add(entity["id"])
            unique_entities.append(entity)

        for left, right in combinations(unique_entities, 2):
            if (left["id"], right["id"]) in graph_edges:
                continue
            candidates.append({
                "article_id": article.get("id", path.stem),
                "title": article.get("title", ""),
                "source": left["name"],
                "target": right["name"],
                "source_id": left["id"],
                "target_id": right["id"],
                "source_mentions": left["mention_count"],
                "target_mentions": right["mention_count"],
                "reason": "high co-mention pair without graph edge",
            })

    candidates.sort(
        key=lambda item: (
            article_number(str(item["article_id"])),
            -(item["source_mentions"] + item["target_mentions"]),
            item["source"],
            item["target"],
        )
    )
    return candidates


def isolated_entities(
    graph: dict[str, Any],
    min_mentions: int,
    article_scope: set[str],
) -> list[dict]:
    if not article_scope:
        return []
    isolated = []
    for node in graph.get("nodes", []):
        if int(node.get("degree", 0)) != 0:
            continue
        if int(node.get("mention_count", 0)) < min_mentions:
            continue
        source_article_ids = {
            item.get("article_id")
            for item in node.get("source_articles", [])
            if item.get("article_id")
        }
        if not source_article_ids.intersection(article_scope):
            continue
        isolated.append({
            "id": node["id"],
            "name": node.get("name", node["id"]),
            "type": node.get("type", ""),
            "mention_count": node.get("mention_count", 0),
            "article_count": node.get("article_count", 0),
            "articles": [
                item.get("article_id")
                for item in node.get("source_articles", [])[:3]
            ],
        })
    isolated.sort(key=lambda item: (-item["mention_count"], item["name"]))
    return isolated


def print_items(title: str, items: list[dict], limit: int) -> None:
    if not items:
        print(f"  {title}: none")
        return
    print(f"  {title}: {len(items)}")
    for item in items[:limit]:
        print(f"    - {item}")
    if len(items) > limit:
        print(f"    ... {len(items) - limit} more")


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-deploy KG review gate")
    parser.add_argument("--json-report", type=Path, help="Optional path for machine-readable report")
    parser.add_argument("--no-fail", action="store_true", help="Print blocking findings but exit 0")
    parser.add_argument(
        "--scan-recent",
        action="store_true",
        help="Also print candidates from the recent-window article range",
    )
    args = parser.parse_args()

    config = load_config()
    graph = load_json(GRAPH_VIEW_PATH)
    article_index = load_json(ARTICLE_INDEX_PATH)
    article_ids = [
        str(article["id"])
        for article in article_index.get("articles", [])
        if str(article["id"]) not in EXCLUDED_ARTICLES
    ]
    latest_article_id = article_ids[-1] if article_ids else "000"
    last_review_id = str(config["last_holistic_review_article"]).zfill(3)
    unreviewed_ids = [
        article_id
        for article_id in article_ids
        if article_number(article_id) > article_number(last_review_id)
    ]

    id_to_node, lookup = build_lookup(graph)
    graph_edges = edge_key_set(graph)
    missing_graph, missing_payload = check_entity_survival(article_ids, lookup)
    review_scope_ids = list(unreviewed_ids)
    if args.scan_recent:
        recent_window = int(config["recent_window_articles"])
        review_scope_ids = article_ids[-recent_window:] if recent_window > 0 else article_ids

    candidates = candidate_pairs(
        review_scope_ids,
        lookup,
        graph_edges,
        int(config["candidate_pair_min_mentions"]),
    )
    isolated = isolated_entities(
        graph,
        int(config["candidate_pair_min_mentions"]),
        set(review_scope_ids),
    )

    blocking: list[str] = []
    if len(unreviewed_ids) > int(config["max_unreviewed_articles"]):
        print(
            "Advisory: holistic review is stale: "
            f"{len(unreviewed_ids)} articles after {last_review_id}"
        )
    if missing_graph:
        blocking.append(f"{len(missing_graph)} extracted entities missing from graph")
    if missing_payload:
        blocking.append(f"{len(missing_payload)} graph entities missing from article payloads")

    print("KG review gate")
    print(f"  articles: {len(article_ids)} (latest {latest_article_id})")
    print(f"  holistic review covered through: {last_review_id}")
    print(f"  unreviewed articles: {len(unreviewed_ids)}")
    print(f"  graph: {len(id_to_node)} nodes, {len(graph.get('links', []))} links")
    print_items("missing extracted entities in graph", missing_graph, 10)
    print_items("missing extracted entities in article payloads", missing_payload, 10)
    print_items(
        "isolated mentioned entities",
        isolated,
        int(config["max_isolated_entities_print"]),
    )
    print_items(
        "relationship review candidates",
        candidates,
        int(config["max_candidate_pairs_print"]),
    )

    report = {
        "article_count": len(article_ids),
        "latest_article_id": latest_article_id,
        "last_holistic_review_article": last_review_id,
        "unreviewed_article_ids": unreviewed_ids,
        "missing_graph": missing_graph,
        "missing_payload": missing_payload,
        "isolated_entities": isolated,
        "relationship_candidates": candidates,
        "blocking": blocking,
    }
    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        with open(args.json_report, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"  report: {args.json_report}")

    if blocking:
        print("  BLOCKING:")
        for item in blocking:
            print(f"    - {item}")
        return 0 if args.no_fail else 1

    print("  OK: no blocking KG review findings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
