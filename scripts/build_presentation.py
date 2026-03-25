#!/usr/bin/env python3
"""
build_presentation.py -- Generate frontend data from the corrected graph.

Reads data/graph/canonical_corrected.json (output of post_process.py)
and generates:
  - web-data/graph-view.json       (full graph data for frontend)
  - web-data/leaderboards.json     (4 category leaderboards)
  - web-data/article-index.json    (article index rebuilt from source articles)
  - web-data/articles/*.json       (per-article payloads for article pages)
  - data/config/display_registry.json (updated leaderboard segments)

Usage:
    python scripts/build_presentation.py
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Allow importing sibling modules when run as script
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from graph_utils import RELATION_STRENGTH, DEFAULT_RELATION_STRENGTH, MERGE_MAP, sanitize_id
from overrides import COMPANY_SUBSIDIARIES, EXCLUDED_ARTICLES, LEADERBOARD_EXCLUDE, NODE_MERGES
from pipeline_state import extracted_artifact_path, load_articles

PROJECT_ROOT = SCRIPT_DIR.parent
CORRECTED_PATH = PROJECT_ROOT / "data" / "graph" / "canonical_corrected.json"
WEB_DATA_DIR = PROJECT_ROOT / "web-data"
GRAPH_VIEW_PATH = WEB_DATA_DIR / "graph-view.json"
LEADERBOARD_PATH = WEB_DATA_DIR / "leaderboards.json"
ARTICLE_INDEX_PATH = WEB_DATA_DIR / "article-index.json"
ARTICLE_PAYLOAD_DIR = WEB_DATA_DIR / "articles"
DISPLAY_REGISTRY_PATH = PROJECT_ROOT / "data" / "config" / "display_registry.json"


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

# Per-category composite_weight formula (same as post_process.py step7,
# but max values are computed within each category, not globally).
#
# CW = 0.50 * (degree / max_degree)
#    + 0.35 * (time_weighted_mc / max_time_weighted_mc)
#    + 0.15 * (time_weighted_ac / max_time_weighted_ac)
#
# Time decay: decay(article) = 2^(-age_days / 180)
# time_weighted_mc = Σ min(mc_per_article, 25) × decay
# time_weighted_ac = Σ decay
# Degree does NOT decay.
#
# This ensures each leaderboard ranks entities against their own peers,
# not against unrelated entity types.

HALF_LIFE = 180  # days
_TODAY = date.today()


def _decay(article_date_str: str) -> float:
    try:
        d = datetime.strptime(article_date_str, "%Y-%m-%d").date()
        age = (_TODAY - d).days
        return 2 ** (-age / HALF_LIFE)
    except (ValueError, TypeError):
        return 0.2


def _compute_tw_metrics(entry: dict) -> tuple[float, float]:
    """Compute time-weighted mention count and article count for one entry."""
    tw_mc = 0.0
    tw_ac = 0.0
    for sa in entry.get("source_articles", []):
        mc_raw = sa.get("mention_count", 1) if isinstance(sa, dict) else 1
        mc_capped = min(mc_raw, 25)
        d_str = sa.get("date", "") if isinstance(sa, dict) else ""
        df = _decay(d_str)
        tw_mc += mc_capped * df
        tw_ac += df
    return tw_mc, tw_ac


def _compute_category_cw(entries: list[dict]) -> list[dict]:
    """Recompute composite_weight using per-category normalization.

    Same formula as post_process.py step7 (with time decay), but max
    values are taken from this category only (not global).

    Mutates entries in-place (updates composite_weight).
    Returns the list sorted by composite_weight descending.
    """
    if not entries:
        return entries

    max_degree = max(e.get("degree", 0) for e in entries) or 1

    # Compute time-weighted metrics for each entry
    tw_data = [_compute_tw_metrics(e) for e in entries]
    max_tw_mc = max(tw[0] for tw in tw_data) or 1
    max_tw_ac = max(tw[1] for tw in tw_data) or 1

    for i, e in enumerate(entries):
        nd = e.get("degree", 0) / max_degree
        nm = tw_data[i][0] / max_tw_mc
        na = tw_data[i][1] / max_tw_ac
        cw = 0.50 * nd + 0.35 * nm + 0.15 * na
        e["composite_weight"] = round(cw, 4)

    return sorted(entries, key=lambda e: e["composite_weight"], reverse=True)


def _consolidate_company_subsidiaries(
    company_nodes: list[dict],
    all_nodes_map: dict[str, dict],
) -> list[dict]:
    """Merge subsidiary stats into parent companies (leaderboard only).

    - degree: sum parent + all children
    - mention_count: sum parent + all children
    - article_count: union of source_article IDs (no double-counting)

    Subsidiaries are removed from the company list.
    Returns a new list (does not mutate original graph data).
    """
    # Build set of all subsidiary IDs for fast lookup
    all_sub_ids: set[str] = set()
    for subs in COMPANY_SUBSIDIARIES.values():
        all_sub_ids.update(subs)

    result = []
    consolidated_count = 0

    for node in company_nodes:
        nid = node["id"]

        # Skip subsidiaries — their stats will be merged into parent
        if nid in all_sub_ids:
            continue

        if nid in COMPANY_SUBSIDIARIES:
            # Deep copy to avoid mutating the original graph node
            merged = dict(node)
            total_degree = node.get("degree", 0)
            total_mentions = node.get("mention_count", 0)
            # Collect article IDs and source_articles from parent
            all_articles: set[str] = set()
            # Merge source_articles by article_id (keep highest mc per article)
            sa_by_aid: dict[str, dict] = {}
            for a in node.get("source_articles", []):
                aid = a.get("article_id", "")
                if aid:
                    all_articles.add(aid)
                    if aid not in sa_by_aid or a.get("mention_count", 0) > sa_by_aid[aid].get("mention_count", 0):
                        sa_by_aid[aid] = a

            sub_names = []
            for sub_id in COMPANY_SUBSIDIARIES[nid]:
                sub_node = all_nodes_map.get(sub_id)
                if sub_node:
                    total_degree += sub_node.get("degree", 0)
                    total_mentions += sub_node.get("mention_count", 0)
                    for a in sub_node.get("source_articles", []):
                        aid = a.get("article_id", "")
                        if aid:
                            all_articles.add(aid)
                            # Sum mention counts for same article
                            if aid in sa_by_aid:
                                existing = dict(sa_by_aid[aid])
                                existing["mention_count"] = existing.get("mention_count", 0) + a.get("mention_count", 0)
                                sa_by_aid[aid] = existing
                            else:
                                sa_by_aid[aid] = a
                    sub_names.append(sub_node.get("name", sub_id))
                else:
                    print(f"  WARNING: subsidiary '{sub_id}' not found "
                          f"in graph for parent '{nid}'")

            merged["degree"] = total_degree
            merged["mention_count"] = total_mentions
            merged["article_count"] = len(all_articles)
            merged["source_articles"] = list(sa_by_aid.values())
            result.append(merged)

            print(f"  Consolidated: {node.get('name', nid)} "
                  f"← {', '.join(sub_names)} "
                  f"(deg={total_degree}, men={total_mentions}, "
                  f"art={len(all_articles)})")
            consolidated_count += 1
        else:
            # Non-parent company: shallow copy for CW mutation safety
            result.append(dict(node))

    removed = len(company_nodes) - len(result)
    print(f"  Company consolidation: {consolidated_count} parents merged, "
          f"{removed} subsidiaries removed")
    return result


def build_leaderboards(data: dict) -> dict:
    """Build the 4-category leaderboard from graph data.

    Each category uses per-category normalization: composite_weight is
    computed using max values from within that category only, so that
    rankings reflect relative importance among peers.

    Company leaderboard additionally consolidates subsidiary stats into
    parent companies (configured in overrides.py COMPANY_SUBSIDIARIES).
    """
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

    # ── Collect raw category pools (shallow copies for CW mutation) ──

    raw_products = [dict(n) for n in nodes if n.get("type") == "product"]
    founder_excludes = set(LEADERBOARD_EXCLUDE.get("founders", []))
    raw_founders = [dict(n) for n in nodes
                    if n.get("type") == "person"
                    and n["id"] in founder_persons
                    and n["id"] not in founder_excludes]

    # VCs: type=vc_firm + special company nodes that act as VCs
    vc_ids = {n["id"] for n in nodes if n.get("type") == "vc_firm"}
    VC_LEADERBOARD_EXTRAS = {"蚂蚁集团"}
    for nid in VC_LEADERBOARD_EXTRAS:
        if nid in nmap:
            vc_ids.add(nid)
    raw_vcs = [dict(n) for n in nodes if n["id"] in vc_ids]

    raw_companies = [dict(n) for n in nodes if n.get("type") == "company"]

    # ── Company subsidiary consolidation (before normalization) ──
    print("\n  -- Company subsidiary consolidation --")
    raw_companies = _consolidate_company_subsidiaries(raw_companies, nmap)

    # ── Per-category normalization + sort + top N ──
    print("\n  -- Per-category normalization --")

    products = _compute_category_cw(raw_products)[:20]
    founders = _compute_category_cw(raw_founders)[:20]
    vcs = _compute_category_cw(raw_vcs)  # no limit (small list)
    companies = _compute_category_cw(raw_companies)[:20]

    for cat_name, cat_list in [("products", products), ("founders", founders),
                               ("vcs", vcs), ("companies", companies)]:
        if cat_list:
            top = cat_list[0]
            print(f"  {cat_name}: {len(cat_list)} entries, "
                  f"#1 = {top.get('name', '?')} (cw={top['composite_weight']:.4f})")

    # ── Build output ──

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


# ── Article Payloads ──────────────────────────────────────────────────

def _compact_text(text: str) -> str:
    return " ".join((text or "").split())


def build_excerpt(markdown: str, max_len: int = 220) -> str:
    compact = _compact_text(markdown)
    if len(compact) <= max_len:
        return compact
    return compact[: max_len - 3].rstrip() + "..."


def _build_graph_lookup(graph_data: dict) -> tuple[dict[str, dict], dict[str, str]]:
    id_to_node = {node["id"]: node for node in graph_data.get("nodes", [])}
    lookup: dict[str, str] = {}

    for node in graph_data.get("nodes", []):
        node_id = node["id"]
        candidates = [
            node_id,
            node.get("name", ""),
            node.get("displayName", ""),
            *node.get("aliases", []),
        ]
        for candidate in candidates:
            raw = str(candidate or "").strip()
            if not raw:
                continue
            lookup.setdefault(raw, node_id)
            lookup.setdefault(raw.casefold(), node_id)
            lookup.setdefault(sanitize_id(raw), node_id)

    return id_to_node, lookup


def _resolve_graph_node_id(value: object, lookup: dict[str, str]) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    return (
        lookup.get(raw)
        or lookup.get(raw.casefold())
        or lookup.get(sanitize_id(raw))
    )


def _merge_entity_ids(graph_node_ids: set[str]) -> dict[str, str]:
    remap: dict[str, str] = {}

    for merge in NODE_MERGES:
        keep_id = merge["keep"]
        if keep_id not in graph_node_ids:
            continue
        for removed_id in merge.get("remove", []):
            remap[removed_id] = keep_id

    for canonical_name, aliases in MERGE_MAP.items():
        canonical_id = sanitize_id(canonical_name)
        if canonical_id not in graph_node_ids:
            continue
        for alias in aliases:
            alias_id = sanitize_id(alias)
            if alias_id != canonical_id:
                remap.setdefault(alias_id, canonical_id)

    return remap


def build_article_payloads(
    source_articles: list[dict],
    graph_data: dict,
) -> tuple[list[dict], list[str]]:
    id_to_node, lookup = _build_graph_lookup(graph_data)
    graph_node_ids = set(id_to_node)
    entity_id_remap = _merge_entity_ids(graph_node_ids)
    payloads: list[dict] = []
    missing_artifact_ids: list[str] = []

    for article in source_articles:
        article_id = article["id"]
        if article_id in EXCLUDED_ARTICLES:
            continue

        artifact = load_json(extracted_artifact_path(article_id)) or {}
        if not artifact:
            missing_artifact_ids.append(article_id)

        entities = []
        seen_entity_ids: set[str] = set()
        for entity in artifact.get("entities", []):
            raw_id = str(entity.get("id", "")).strip()
            canonical_id = entity_id_remap.get(raw_id)
            if canonical_id is None:
                canonical_id = _resolve_graph_node_id(raw_id, lookup)
            if canonical_id is None:
                canonical_id = _resolve_graph_node_id(entity.get("name"), lookup)
            if canonical_id is None or canonical_id in seen_entity_ids:
                continue

            node = id_to_node[canonical_id]
            entity_aliases = {
                str(alias).strip()
                for alias in entity.get("aliases", [])
                if str(alias).strip()
            }
            entity_aliases.update(
                str(alias).strip()
                for alias in node.get("aliases", [])
                if str(alias).strip()
            )
            entity_aliases.discard(node.get("name", canonical_id))

            entities.append({
                "id": canonical_id,
                "name": node.get("displayName", node.get("name", canonical_id)),
                "type": node.get("type", entity.get("type", "product")),
                "description": node.get("description", entity.get("description", "")),
                "mention_count": int(entity.get("mention_count", 0)),
                "aliases": sorted(entity_aliases),
                "tags": [
                    str(tag).strip()
                    for tag in entity.get("tags", [])
                    if str(tag).strip()
                ],
            })
            seen_entity_ids.add(canonical_id)

        relationships = []
        seen_relationships: set[tuple[str, str, str, str]] = set()
        for relationship in artifact.get("relationships", []):
            relation_type = str(
                relationship.get("relation_type")
                or relationship.get("type")
                or "related"
            ).strip() or "related"
            label = str(
                relationship.get("label")
                or relationship.get("description")
                or relation_type
            ).strip() or relation_type
            source_id = _resolve_graph_node_id(relationship.get("source"), lookup)
            target_id = _resolve_graph_node_id(relationship.get("target"), lookup)
            if not source_id or not target_id or source_id == target_id:
                continue

            dedupe_key = (source_id, target_id, relation_type, label)
            if dedupe_key in seen_relationships:
                continue
            seen_relationships.add(dedupe_key)

            source_node = id_to_node[source_id]
            target_node = id_to_node[target_id]
            relationships.append({
                "source_id": source_id,
                "target_id": target_id,
                "source": source_node.get("displayName", source_node.get("name", source_id)),
                "target": target_node.get("displayName", target_node.get("name", target_id)),
                "relation_type": relation_type,
                "label": label,
                "weight": max(int(relationship.get("weight", 1)), 1),
            })

        entities.sort(key=lambda item: (-item["mention_count"], item["name"]))
        relationships.sort(
            key=lambda item: (
                item["relation_type"],
                item["source"],
                item["target"],
                item["label"],
            )
        )

        payloads.append({
            "id": article_id,
            "title": article["title"],
            "date": article["date"],
            "author": article["author"],
            "path": article["path"],
            "permalink": f"/articles/{article_id}",
            "markdown_link": article["path"],
            "raw_markdown": article["raw_text"],
            "body_markdown": article["text"],
            "excerpt": build_excerpt(article["text"]),
            "entity_count": len(entities),
            "relationship_count": len(relationships),
            "entities": entities,
            "relationships": relationships,
        })

    payloads.sort(key=lambda item: item["id"])
    return payloads, missing_artifact_ids


def sync_article_payloads(article_payloads: list[dict]) -> None:
    ARTICLE_PAYLOAD_DIR.mkdir(parents=True, exist_ok=True)
    expected_filenames = {f"{payload['id']}.json" for payload in article_payloads}

    for existing in ARTICLE_PAYLOAD_DIR.glob("*.json"):
        if existing.name not in expected_filenames:
            existing.unlink()

    for payload in article_payloads:
        save_json(ARTICLE_PAYLOAD_DIR / f"{payload['id']}.json", payload)


def build_article_index(
    article_payloads: list[dict],
    *,
    is_partial: bool,
    missing_article_ids: list[str],
) -> dict:
    articles = [
        {
            "id": payload["id"],
            "title": payload["title"],
            "date": payload["date"],
            "author": payload["author"],
            "path": payload["path"],
            "permalink": payload["permalink"],
            "markdown_link": payload["markdown_link"],
            "excerpt": payload["excerpt"],
            "entity_count": payload["entity_count"],
            "relationship_count": payload["relationship_count"],
        }
        for payload in article_payloads
    ]

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(articles),
        "isPartial": is_partial,
        "missingArticleIds": missing_article_ids,
        "articles": articles,
    }


def validate_graph_metadata(graph_data: dict, expected_article_count: int) -> None:
    metadata = graph_data.get("metadata", {})
    article_count = metadata.get("articleCount")
    included_article_count = metadata.get("includedArticleCount")
    if article_count != expected_article_count:
        raise ValueError(
            f"Graph metadata articleCount={article_count}, expected {expected_article_count}"
        )
    if included_article_count != expected_article_count:
        raise ValueError(
            "Graph metadata includedArticleCount="
            f"{included_article_count}, expected {expected_article_count}"
        )


def validate_article_payloads(
    article_payloads: list[dict],
    graph_data: dict,
    *,
    expected_article_ids: list[str],
) -> None:
    graph_node_ids = {node["id"] for node in graph_data.get("nodes", [])}
    generated_article_ids = [payload["id"] for payload in article_payloads]
    if generated_article_ids != expected_article_ids:
        raise ValueError(
            "Article payload IDs do not match source corpus. "
            f"expected={expected_article_ids}, got={generated_article_ids}"
        )

    bad_entity_refs: list[str] = []
    bad_relationship_refs: list[str] = []

    for payload in article_payloads:
        for entity in payload.get("entities", []):
            if entity["id"] not in graph_node_ids:
                bad_entity_refs.append(f"{payload['id']}:{entity['id']}")
        for relationship in payload.get("relationships", []):
            if relationship["source_id"] not in graph_node_ids:
                bad_relationship_refs.append(
                    f"{payload['id']}:source:{relationship['source_id']}"
                )
            if relationship["target_id"] not in graph_node_ids:
                bad_relationship_refs.append(
                    f"{payload['id']}:target:{relationship['target_id']}"
                )

    if bad_entity_refs:
        raise ValueError(
            "Article payloads contain entity IDs missing from graph: "
            + ", ".join(sorted(bad_entity_refs)[:10])
        )
    if bad_relationship_refs:
        raise ValueError(
            "Article payloads contain relationship refs missing from graph: "
            + ", ".join(sorted(bad_relationship_refs)[:10])
        )


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
    source_articles = load_articles()
    expected_article_ids = [
        article["id"]
        for article in source_articles
        if article["id"] not in EXCLUDED_ARTICLES
    ]

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

    # 3. Per-article payloads
    print(f"\n{'=' * 70}")
    print("Generate article payloads")
    print("=" * 70)
    article_payloads, missing_artifact_ids = build_article_payloads(
        source_articles,
        graph_view,
    )
    sync_article_payloads(article_payloads)
    print(f"  Article payloads: {len(article_payloads)}")
    if missing_artifact_ids:
        print(f"  Missing extracted artifacts: {', '.join(missing_artifact_ids)}")

    # 4. Article index
    print(f"\n{'=' * 70}")
    print("Generate article-index.json")
    print("=" * 70)
    combined_missing_ids = sorted(
        set(graph_view["metadata"].get("missingArticleIds", []))
        | set(missing_artifact_ids)
    )
    article_index = build_article_index(
        article_payloads,
        is_partial=bool(graph_view["metadata"].get("isPartial")) or bool(combined_missing_ids),
        missing_article_ids=combined_missing_ids,
    )
    save_json(ARTICLE_INDEX_PATH, article_index)
    print(f"  Articles: {article_index['count']}")

    # 5. Validation
    print(f"\n{'=' * 70}")
    print("Validate generated data")
    print("=" * 70)
    validate_graph_metadata(graph_view, len(expected_article_ids))
    validate_article_payloads(
        article_payloads,
        graph_view,
        expected_article_ids=expected_article_ids,
    )
    print("  OK: graph metadata and article payloads are internally consistent")

    # 6. Display registry
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
    print(f"  articles/*.json:       {len(article_payloads)} files")
    print(f"  article-index.json:    {article_index['count']} articles")
    print(f"\nOutput directory: {WEB_DATA_DIR}")
    print(f"Display registry: {DISPLAY_REGISTRY_PATH}")


if __name__ == "__main__":
    main()
