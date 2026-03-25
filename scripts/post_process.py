#!/usr/bin/env python3
"""
post_process.py -- Apply declarative overrides to the canonical graph.

Reads data/graph/canonical.json, applies all overrides from overrides.py,
and writes data/graph/canonical_corrected.json.

Usage:
    python scripts/post_process.py
"""

from __future__ import annotations

import copy
import json
import math
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

# Allow importing sibling modules when run as script
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from graph_utils import RELATION_STRENGTH, DEFAULT_RELATION_STRENGTH
from overrides import (
    ALIAS_ADDITIONS,
    ALIAS_REMOVALS,
    BIDIRECTIONAL_RELATION_TYPES,
    DESCRIPTION_OVERRIDES,
    EDGE_FIX_ADDITIONS,
    EDGE_TYPE_FIXES,
    EXTRA_ALIAS_ADDITIONS,
    MISSING_EDGES,
    MISSING_NODES,
    NODE_MERGES,
    NODE_RENAMES,
    TYPE_CORRECTIONS,
)

PROJECT_ROOT = SCRIPT_DIR.parent
CANONICAL_PATH = PROJECT_ROOT / "data" / "graph" / "canonical.json"
CORRECTED_PATH = PROJECT_ROOT / "data" / "graph" / "canonical_corrected.json"


# ── JSON helpers ──────────────────────────────────────────────────────

def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved: {path}")


# ── Graph edge helpers ────────────────────────────────────────────────

def make_edge(source: str, target: str, relation_type: str,
              label: str = "") -> dict:
    """Create a minimal edge matching the GraphLink schema."""
    strength = RELATION_STRENGTH.get(relation_type, DEFAULT_RELATION_STRENGTH)
    return {
        "source": source,
        "target": target,
        "relation_type": relation_type,
        "type": relation_type,
        "label": label,
        "weight": 1,
        "strength": strength,
        "effective_weight": strength,
        "article_count": 0,
        "evidence_articles": [],
        "evidences": [],
    }


def directed_key(link: dict) -> tuple:
    return (link["source"], link["target"], link["relation_type"])


def directed_keys(links: list[dict]) -> set:
    return {directed_key(link) for link in links}


def node_map(data: dict) -> dict:
    """Return dict id -> node."""
    return {n["id"]: n for n in data["nodes"]}


def find_node(data: dict, nid: str) -> dict | None:
    """Case-insensitive node lookup. Returns exact-match first, then
    lower-case fallback."""
    for n in data["nodes"]:
        if n["id"] == nid:
            return n
    nid_lower = nid.lower()
    for n in data["nodes"]:
        if n["id"].lower() == nid_lower:
            return n
    return None


def find_node_id(data: dict, nid: str) -> str | None:
    """Return the actual node id (case-corrected) or None."""
    n = find_node(data, nid)
    return n["id"] if n else None


def remove_duplicate_edges(data: dict) -> int:
    """Remove exact duplicate directed edges. Keep first occurrence."""
    seen = set()
    to_remove = []
    for i, link in enumerate(data["links"]):
        dk = directed_key(link)
        if dk in seen:
            to_remove.append(i)
        else:
            seen.add(dk)
    for i in sorted(to_remove, reverse=True):
        data["links"].pop(i)
    return len(to_remove)


def add_edge_if_missing(data: dict, source: str, target: str,
                        relation_type: str, label: str = "",
                        *, check_reverse: bool = False) -> bool:
    """Add a directed edge if it doesn't already exist.
    If check_reverse, also skip if reverse exists.
    Returns True if added."""
    dk = (source, target, relation_type)
    for link in data["links"]:
        if directed_key(link) == dk:
            return False
    if check_reverse:
        rk = (target, source, relation_type)
        for link in data["links"]:
            if directed_key(link) == rk:
                return False
    # Verify both nodes exist
    ids = {n["id"] for n in data["nodes"]}
    if source not in ids or target not in ids:
        return False
    data["links"].append(make_edge(source, target, relation_type, label))
    return True


# ── Step 0: Fix duplicate-ID nodes ────────────────────────────────────

def step0_fix_duplicate_ids(data: dict) -> int:
    """Merge nodes that share the same ID but differ in name casing.
    Keep the one with higher mention_count."""
    print("\n" + "=" * 70)
    print("STEP 0: Fix duplicate-ID nodes (case variants)")
    print("=" * 70)

    id_groups: dict[str, list] = defaultdict(list)
    for i, n in enumerate(data["nodes"]):
        id_groups[n["id"]].append((i, n))

    merged_count = 0
    indices_to_remove = []

    for node_id, group in id_groups.items():
        if len(group) < 2:
            continue
        group.sort(key=lambda x: x[1].get("mention_count", 0), reverse=True)
        keep_idx, keep_node = group[0]

        for remove_idx, remove_node in group[1:]:
            print(f"    Dedup '{node_id}': keep '{keep_node['name']}'"
                  f"(m={keep_node.get('mention_count', 0)}), "
                  f"drop '{remove_node['name']}'"
                  f"(m={remove_node.get('mention_count', 0)})")

            keep_node["mention_count"] = (
                keep_node.get("mention_count", 0)
                + remove_node.get("mention_count", 0)
            )
            aliases = set(keep_node.get("aliases", []))
            if remove_node["name"] != keep_node["name"]:
                aliases.add(remove_node["name"])
            aliases.update(remove_node.get("aliases", []))
            aliases.discard(keep_node["name"])
            keep_node["aliases"] = sorted(aliases)

            tags = set(keep_node.get("tags", []))
            tags.update(remove_node.get("tags", []))
            keep_node["tags"] = sorted(tags)

            existing_art = {
                a["article_id"]
                for a in keep_node.get("source_articles", [])
            }
            for art in remove_node.get("source_articles", []):
                if art["article_id"] not in existing_art:
                    keep_node.setdefault("source_articles", []).append(art)
                    existing_art.add(art["article_id"])
            keep_node["article_count"] = len(
                keep_node.get("source_articles", [])
            )

            indices_to_remove.append(remove_idx)
            merged_count += 1

    for idx in sorted(set(indices_to_remove), reverse=True):
        data["nodes"].pop(idx)

    dup = remove_duplicate_edges(data)
    print(f"  Merged {merged_count} duplicate-ID pairs, "
          f"removed {dup} dup edges")
    return merged_count


# ── Step 0b: Add Missing Nodes ────────────────────────────────────────

def step0b_add_missing_nodes(data: dict) -> int:
    """Add nodes declared in MISSING_NODES that don't already exist."""
    print("\n" + "=" * 70)
    print("STEP 0b: Add Missing Nodes")
    print("=" * 70)

    existing_ids = {n["id"] for n in data["nodes"]}
    added = 0
    for entry in MISSING_NODES:
        nid = entry["id"]
        if nid in existing_ids:
            print(f"    skip '{nid}' (already exists)")
            continue
        node = {
            "id": nid,
            "name": entry["name"],
            "displayName": entry["name"],
            "type": entry.get("type", "company"),
            "description": entry.get("description", ""),
            "aliases": entry.get("aliases", []),
            "tags": [],
            "mention_count": 0,
            "article_count": 0,
            "source_article_count": 0,
            "references": 0,
            "degree": 0,
            "composite_weight": 0,
            "source_articles": [],
        }
        data["nodes"].append(node)
        existing_ids.add(nid)
        print(f"    + added '{nid}' ({entry.get('type', 'company')})")
        added += 1

    print(f"  Total nodes added: {added}")
    return added


# ── Step 1: Node Merges ───────────────────────────────────────────────

def merge_nodes(data: dict, keep_id: str, remove_ids: list[str], *,
                new_name: str | None = None,
                add_aliases: list[str] | None = None,
                new_type: str | None = None) -> int:
    """Merge *remove_ids* into *keep_id*.
    - Sum mention_count
    - Union aliases, tags, source_articles (dedup)
    - Redirect all edges; drop self-loops; drop directed duplicates
    - Remove merged nodes from data["nodes"]
    Returns count of actually merged nodes.
    """
    nmap = node_map(data)
    keep_node = nmap.get(keep_id)
    if keep_node is None:
        actual = find_node_id(data, keep_id)
        if actual:
            keep_id = actual
            keep_node = nmap[actual]
        else:
            print(f"    [merge] keep node '{keep_id}' not found -- skip")
            return 0

    merged = 0
    for rid in remove_ids:
        nmap = node_map(data)
        actual_rid = rid
        if rid not in nmap:
            actual_rid = find_node_id(data, rid)
        if actual_rid is None or actual_rid not in nmap:
            continue
        if actual_rid == keep_id:
            continue

        remove_node = nmap[actual_rid]
        print(f"    merge '{remove_node['name']}'({actual_rid}) -> "
              f"'{keep_node['name']}'({keep_id})")

        # 1. Sum mention_count
        keep_node["mention_count"] = (
            keep_node.get("mention_count", 0)
            + remove_node.get("mention_count", 0)
        )

        # 2. Union aliases
        aliases = set(keep_node.get("aliases", []))
        if remove_node["name"] != keep_node["name"]:
            aliases.add(remove_node["name"])
        aliases.update(remove_node.get("aliases", []))
        aliases.discard(keep_node["name"])
        keep_node["aliases"] = sorted(aliases)

        # 3. Union tags
        tags = set(keep_node.get("tags", []))
        tags.update(remove_node.get("tags", []))
        keep_node["tags"] = sorted(tags)

        # 4. Union source_articles
        existing_art_ids = {
            a["article_id"] for a in keep_node.get("source_articles", [])
        }
        for art in remove_node.get("source_articles", []):
            if art["article_id"] not in existing_art_ids:
                keep_node.setdefault("source_articles", []).append(art)
                existing_art_ids.add(art["article_id"])
        keep_node["article_count"] = len(
            keep_node.get("source_articles", [])
        )
        keep_node["source_article_count"] = keep_node["article_count"]
        keep_node["references"] = keep_node["article_count"]

        # 5. Redirect edges
        existing_dir = directed_keys(data["links"])
        to_remove_idx = []
        to_add = []
        for i, link in enumerate(data["links"]):
            if link["source"] != actual_rid and link["target"] != actual_rid:
                continue
            new_link = copy.deepcopy(link)
            if new_link["source"] == actual_rid:
                new_link["source"] = keep_id
            if new_link["target"] == actual_rid:
                new_link["target"] = keep_id
            if new_link["source"] == new_link["target"]:
                to_remove_idx.append(i)
                continue
            dk = directed_key(new_link)
            if dk not in existing_dir:
                to_add.append(new_link)
                existing_dir.add(dk)
            to_remove_idx.append(i)

        for i in sorted(set(to_remove_idx), reverse=True):
            data["links"].pop(i)
        data["links"].extend(to_add)

        # 6. Remove the merged node
        data["nodes"] = [n for n in data["nodes"] if n["id"] != actual_rid]
        merged += 1

    # Apply optional overrides on the kept node
    nmap = node_map(data)
    if keep_id in nmap:
        kn = nmap[keep_id]
        if new_name:
            kn["name"] = new_name
            kn["displayName"] = new_name
        if add_aliases:
            als = set(kn.get("aliases", []))
            als.update(add_aliases)
            als.discard(kn["name"])
            kn["aliases"] = sorted(als)
        if new_type:
            kn["type"] = new_type

    return merged


def step1_node_merges(data: dict) -> int:
    print("\n" + "=" * 70)
    print("STEP 1: Node Merges")
    print("=" * 70)
    total = 0
    for entry in NODE_MERGES:
        total += merge_nodes(
            data,
            entry["keep"],
            entry["remove"],
            new_name=entry.get("new_name"),
            add_aliases=entry.get("add_aliases"),
            new_type=entry.get("new_type"),
        )
    dup = remove_duplicate_edges(data)
    print(f"\n  Removed {dup} duplicate edges after merges")
    print(f"  Total nodes merged: {total}")
    return total


# ── Step 2: Type Corrections ─────────────────────────────────────────

def step2_type_corrections(data: dict) -> int:
    print("\n" + "=" * 70)
    print("STEP 2: Node Type Corrections")
    print("=" * 70)
    nmap = node_map(data)
    changes = 0

    for nid, correct_type in TYPE_CORRECTIONS.items():
        actual = find_node_id(data, nid)
        if actual and nmap.get(actual, {}).get("type") != correct_type:
            old = nmap[actual]["type"]
            nmap[actual]["type"] = correct_type
            print(f"    {actual}: {old} -> {correct_type}")
            changes += 1

    print(f"  Changed {changes} node types")
    return changes


# ── Step 3: Alias Cleanup ────────────────────────────────────────────

def step3_alias_cleanup(data: dict) -> int:
    print("\n" + "=" * 70)
    print("STEP 3: Alias Cleanup + ID Normalization")
    print("=" * 70)
    nmap = node_map(data)
    changes = 0

    # 3a. Remove conflicting aliases
    print("  -- 3a. Remove conflicting aliases --")
    for nid, bad_aliases in ALIAS_REMOVALS:
        n = nmap.get(nid)
        if not n:
            continue
        before = list(n.get("aliases", []))
        bad_set = set(bad_aliases)
        # For minimax + 胖猫: remove any alias *containing* 胖猫
        if nid == "minimax":
            after = [a for a in before
                     if not any(bad in a for bad in bad_aliases)]
        else:
            after = [a for a in before if a not in bad_set]
        if len(after) != len(before):
            removed = set(before) - set(after)
            n["aliases"] = after
            print(f"    {nid}: removed aliases {removed}")
            changes += 1

    # 3b. Add normalisation aliases
    print("  -- 3b. Add normalisation aliases --")
    for nid, new_als in ALIAS_ADDITIONS.items():
        n = nmap.get(nid)
        if not n:
            continue
        als = set(n.get("aliases", []))
        added = set(new_als) - als - {n["name"]}
        if added:
            als.update(added)
            n["aliases"] = sorted(als)
            print(f"    {nid}: added aliases {added}")
            changes += 1

    # 3c. Rename generic nodes
    print("  -- 3c. Rename generic nodes --")
    for nid, new_name, new_aliases in NODE_RENAMES:
        n = nmap.get(nid)
        if n and n.get("name") != new_name:
            n["name"] = new_name
            n["displayName"] = new_name
            als = set(n.get("aliases", []))
            als.update(new_aliases)
            als.discard(new_name)
            n["aliases"] = sorted(als)
            print(f"    {nid} -> renamed to {new_name}, aliases={n['aliases']}")
            changes += 1

    # 3d. Extra alias additions
    print("  -- 3d. Extra alias additions --")
    for nid, extra_aliases in EXTRA_ALIAS_ADDITIONS:
        n = nmap.get(nid)
        if n:
            als = set(n.get("aliases", []))
            before_len = len(als)
            als.update(extra_aliases)
            als.discard(n["name"])
            n["aliases"] = sorted(als)
            if len(als) > before_len:
                print(f"    {nid}: added {', '.join(extra_aliases)}")
                changes += 1

    print(f"  Total alias changes: {changes}")
    return changes


# ── Step 3b: Description Overrides ────────────────────────────────────

def step3b_description_overrides(data: dict) -> int:
    """Override node descriptions with neutral rewording."""
    print("\n" + "=" * 70)
    print("STEP 3b: Description Overrides")
    print("=" * 70)
    nmap = node_map(data)
    changes = 0
    for nid, new_desc in DESCRIPTION_OVERRIDES.items():
        actual = find_node_id(data, nid)
        if actual and actual in nmap:
            old_desc = nmap[actual].get("description", "")
            if old_desc != new_desc:
                nmap[actual]["description"] = new_desc
                print(f"    {actual}: desc updated")
                changes += 1
    print(f"  Total description overrides: {changes}")
    return changes


# ── Step 4: Edge Type Corrections ────────────────────────────────────

def step4_edge_type_corrections(data: dict) -> int:
    print("\n" + "=" * 70)
    print("STEP 4: Edge Type Corrections")
    print("=" * 70)
    changes = 0

    def rid(nid):
        return find_node_id(data, nid)

    for src, tgt, old_type, fix in EDGE_TYPE_FIXES:
        s = rid(src)
        t = rid(tgt)
        if not s or not t:
            continue

        if fix.get("delete"):
            # Delete the edge
            for i, link in enumerate(data["links"]):
                if (link["source"] == s and link["target"] == t
                        and link["relation_type"] == old_type):
                    data["links"].pop(i)
                    print(f"    {s} -> {t}: deleted {old_type}")
                    changes += 1
                    break
            continue

        new_source = rid(fix["new_source"]) if fix.get("new_source") else None
        new_target = rid(fix["new_target"]) if fix.get("new_target") else None
        new_type = fix.get("new_type")
        new_label = fix.get("label")

        found = False
        for link in data["links"]:
            if (link["source"] == s and link["target"] == t
                    and link["relation_type"] == old_type):
                if new_source:
                    # Check if the new edge already exists
                    dk_new = (new_source, new_target or t,
                              new_type or old_type)
                    already = any(directed_key(l) == dk_new
                                  for l in data["links"])
                    if already:
                        # Delete this edge as duplicate
                        idx = data["links"].index(link)
                        data["links"].pop(idx)
                        print(f"    {s} -> {t}: deleted {old_type} "
                              f"(target already has edge)")
                        changes += 1
                        found = True
                        break
                    link["source"] = new_source
                if new_target:
                    link["target"] = new_target
                if new_type:
                    link["relation_type"] = new_type
                    link["type"] = new_type
                if new_label:
                    link["label"] = new_label
                desc_parts = []
                if new_source:
                    desc_parts.append(f"source->{new_source}")
                if new_target:
                    desc_parts.append(f"target->{new_target}")
                if new_type:
                    desc_parts.append(f"type->{new_type}")
                print(f"    {s} -> {t}: {old_type} -> "
                      f"{', '.join(desc_parts) if desc_parts else 'updated'}")
                changes += 1
                found = True
                break

        if not found:
            # Edge doesn't exist with old_type -- ensure the correct edge
            final_src = new_source or s
            final_tgt = new_target or t
            final_type = new_type or old_type
            final_label = new_label or f"{final_src} {final_type} {final_tgt}"
            if add_edge_if_missing(data, final_src, final_tgt, final_type,
                                   final_label):
                print(f"    {final_src} -> {final_tgt}: added {final_type} "
                      f"(no {old_type} edge found)")
                changes += 1

    # Additional edges to add after edge fixes
    for src, tgt, rel, label in EDGE_FIX_ADDITIONS:
        s = rid(src)
        t = rid(tgt)
        if s and t:
            if add_edge_if_missing(data, s, t, rel, label):
                print(f"    {s} -> {t}: added {rel}")
                changes += 1

    dup = remove_duplicate_edges(data)
    if dup:
        print(f"  Removed {dup} duplicate edges after fixes")

    print(f"  Total edge changes: {changes}")
    return changes


# ── Step 5: Add Missing Edges ────────────────────────────────────────

SYMMETRIC_RELATIONS = {
    "competes_with", "collaborates_with", "compares_to", "co_founded",
}


def step5_add_missing_edges(data: dict) -> int:
    print("\n" + "=" * 70)
    print("STEP 5: Add Missing Edges")
    print("=" * 70)
    count = 0

    def rid(nid):
        return find_node_id(data, nid)

    for src, tgt, rel, label in MISSING_EDGES:
        s = rid(src)
        t = rid(tgt)
        if s and t:
            check_rev = rel in SYMMETRIC_RELATIONS
            if add_edge_if_missing(data, s, t, rel, label,
                                   check_reverse=check_rev):
                print(f"    + {s} --{rel}--> {t}")
                count += 1

    print(f"  Total edges added: {count}")
    return count


# ── Step 6: Bidirectional Edge Completion ─────────────────────────────

def step6_bidirectional_completion(data: dict) -> int:
    print("\n" + "=" * 70)
    print("STEP 6: Bidirectional Edge Completion")
    print("=" * 70)

    existing_dir = directed_keys(data["links"])
    new_edges = []
    total_added = 0

    for rel_type in BIDIRECTIONAL_RELATION_TYPES:
        count = 0
        for link in list(data["links"]):
            if link["relation_type"] != rel_type:
                continue
            reverse_key = (link["target"], link["source"], rel_type)
            if reverse_key not in existing_dir:
                rev = make_edge(link["target"], link["source"],
                                rel_type, link.get("label", ""))
                new_edges.append(rev)
                existing_dir.add(reverse_key)
                count += 1
        print(f"  Added {count} reverse {rel_type} edges")
        total_added += count

    data["links"].extend(new_edges)

    dup = remove_duplicate_edges(data)
    if dup:
        print(f"  Removed {dup} duplicates after bidirectional completion")

    return total_added


# ── Step 7: Recalculate degree + composite_weight ─────────────────────

def step7_recalculate(data: dict) -> None:
    print("\n" + "=" * 70)
    print("STEP 7: Recalculate degree + composite_weight")
    print("=" * 70)

    # 1. Degree
    degree: dict[str, int] = defaultdict(int)
    for link in data["links"]:
        degree[link["source"]] += 1
        degree[link["target"]] += 1
    for n in data["nodes"]:
        n["degree"] = degree.get(n["id"], 0)

    # 2. article_count from source_articles
    for n in data["nodes"]:
        n["article_count"] = len(n.get("source_articles", []))
        n["source_article_count"] = n["article_count"]
        n["references"] = n["article_count"]

    # 3. composite_weight (with time decay)
    #    CW = 0.50 * norm_degree
    #       + 0.35 * norm_time_weighted_mc
    #       + 0.15 * norm_time_weighted_ac
    #
    #    Time decay: decay(article) = 2^(-age_days / 180)
    #    time_weighted_mc = Σ min(mc_per_article, 25) × decay
    #    time_weighted_ac = Σ decay
    #    Degree is structural and does NOT decay.

    HALF_LIFE = 180  # days
    today = date.today()

    def _decay(article_date_str: str) -> float:
        try:
            d = datetime.strptime(article_date_str, "%Y-%m-%d").date()
            age = (today - d).days
            return 2 ** (-age / HALF_LIFE)
        except (ValueError, TypeError):
            return 0.2  # fallback for missing/bad dates

    max_degree = max(
        (n.get("degree", 0) for n in data["nodes"]), default=1
    ) or 1

    # Compute time-weighted mentions and article counts
    tw_mentions = []
    tw_articles = []
    for n in data["nodes"]:
        tw_mc = 0.0
        tw_ac = 0.0
        for sa in n.get("source_articles", []):
            mc_raw = sa.get("mention_count", 1) if isinstance(sa, dict) else 1
            mc_capped = min(mc_raw, 25)
            d_str = sa.get("date", "") if isinstance(sa, dict) else ""
            df = _decay(d_str)
            tw_mc += mc_capped * df
            tw_ac += df
        tw_mentions.append(tw_mc)
        tw_articles.append(tw_ac)

    max_tw_mc = max(tw_mentions) if tw_mentions else 1
    max_tw_mc = max_tw_mc or 1
    max_tw_ac = max(tw_articles) if tw_articles else 1
    max_tw_ac = max_tw_ac or 1

    for i, n in enumerate(data["nodes"]):
        nd = n.get("degree", 0) / max_degree
        nm = tw_mentions[i] / max_tw_mc
        na = tw_articles[i] / max_tw_ac
        cw = 0.50 * nd + 0.35 * nm + 0.15 * na
        n["composite_weight"] = round(cw, 4)

    print(f"  half_life={HALF_LIFE}d, max_tw_mc={max_tw_mc:.1f}, "
          f"max_tw_ac={max_tw_ac:.1f}, max_degree={max_degree}")

    # Top 10
    top = sorted(data["nodes"],
                 key=lambda n: n["composite_weight"], reverse=True)[:10]
    for n in top:
        print(f"    {n['name']:20s}  cw={n['composite_weight']:.4f}  "
              f"(deg={n['degree']}, men={n['mention_count']}, "
              f"art={n['article_count']})")


# ── Main pipeline ─────────────────────────────────────────────────────

def main() -> None:
    print("=" * 70)
    print("post_process.py -- Apply overrides to canonical graph")
    print("=" * 70)

    if not CANONICAL_PATH.exists():
        print(f"ERROR: {CANONICAL_PATH} not found.")
        print("Run build_graph.py first to generate the canonical graph.")
        sys.exit(1)

    data = load_json(CANONICAL_PATH)
    orig_nodes = len(data["nodes"])
    orig_links = len(data["links"])
    print(f"\nLoaded: {orig_nodes} nodes, {orig_links} links")
    print(f"Node types: {dict(Counter(n['type'] for n in data['nodes']))}")

    # Apply overrides in order
    s0 = step0_fix_duplicate_ids(data)
    s0b = step0b_add_missing_nodes(data)
    s1 = step1_node_merges(data)
    s2 = step2_type_corrections(data)
    s3 = step3_alias_cleanup(data)
    s3b = step3b_description_overrides(data)
    s4 = step4_edge_type_corrections(data)
    s5 = step5_add_missing_edges(data)
    s6 = step6_bidirectional_completion(data)
    step7_recalculate(data)

    # Save corrected graph
    save_json(CORRECTED_PATH, data)

    # ── Final Summary ──
    final_nodes = len(data["nodes"])
    final_links = len(data["links"])
    type_counts = Counter(n["type"] for n in data["nodes"])
    rel_counts = Counter(l["relation_type"] for l in data["links"])

    print(f"\n{'=' * 70}")
    print("FINAL SUMMARY")
    print("=" * 70)
    print(f"Nodes: {orig_nodes} -> {final_nodes} "
          f"(delta: {final_nodes - orig_nodes:+d})")
    print(f"Links: {orig_links} -> {final_links} "
          f"(delta: {final_links - orig_links:+d})")
    print(f"\nNode types: {dict(type_counts)}")
    print(f"\nRelation types:")
    for rt, c in sorted(rel_counts.items()):
        print(f"  {rt}: {c}")

    # Verify
    edge_dup = Counter(directed_key(l) for l in data["links"])
    dups = {k: v for k, v in edge_dup.items() if v > 1}
    if dups:
        print(f"\n  WARNING: {len(dups)} duplicate edges remain!")
        for k, v in list(dups.items())[:10]:
            print(f"    {k}: {v}x")
    else:
        print(f"\n  OK: No duplicate edges.")

    node_dup = Counter(n["id"] for n in data["nodes"])
    ndups = {k: v for k, v in node_dup.items() if v > 1}
    if ndups:
        print(f"  WARNING: {len(ndups)} duplicate node IDs!")
    else:
        print(f"  OK: No duplicate node IDs.")

    print(f"\nBreakdown:")
    print(f"  Step 0  (dedup IDs):      {s0} duplicate-ID pairs merged")
    print(f"  Step 0b (missing nodes):  {s0b} nodes added")
    print(f"  Step 1  (merges):         {s1} nodes merged")
    print(f"  Step 2  (type fixes):     {s2} nodes changed")
    print(f"  Step 3  (alias cleanup):  {s3} changes")
    print(f"  Step 3b (desc overrides): {s3b} descriptions updated")
    print(f"  Step 4  (edge fixes):     {s4} edge changes")
    print(f"  Step 5  (missing edges):  {s5} edges added")
    print(f"  Step 6  (bidirectional):  {s6} reverse edges added")

    print(f"\nOutput: {CORRECTED_PATH}")


if __name__ == "__main__":
    main()
