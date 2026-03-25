#!/usr/bin/env python3
"""
enrich_graph.py  --  Phase 1 Knowledge Graph Data Overhaul (Steps 1-9)

This script is IDEMPOTENT: running it twice produces the same result.
It reads web-data/graph-view.json, applies all transformations, and writes
back.  It also rebuilds web-data/leaderboards.json and updates
data/config/display_registry.json.

Usage:
    python3 scripts/enrich_graph.py
"""

import json
import copy
from collections import defaultdict, Counter
from pathlib import Path
from datetime import datetime, timezone

# ── Paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
GRAPH_PATH = PROJECT_ROOT / "web-data" / "graph-view.json"
LEADERBOARD_PATH = PROJECT_ROOT / "web-data" / "leaderboards.json"
DISPLAY_REGISTRY_PATH = PROJECT_ROOT / "data" / "config" / "display_registry.json"

# ── Helpers ────────────────────────────────────────────────────────────

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved: {path}")


def make_edge(source, target, relation_type, label=""):
    """Create a minimal edge matching the GraphLink schema."""
    return {
        "source": source,
        "target": target,
        "relation_type": relation_type,
        "type": relation_type,
        "label": label,
        "weight": 1,
        "strength": 1,
        "effective_weight": 1,
        "article_count": 0,
        "evidence_articles": [],
        "evidences": [],
    }


def directed_key(link):
    return (link["source"], link["target"], link["relation_type"])


def directed_keys(links):
    return {directed_key(l) for l in links}


def undirected_key(link):
    return (frozenset({link["source"], link["target"]}), link["relation_type"])


def undirected_keys(links):
    return {undirected_key(l) for l in links}


def node_map(data):
    """Return dict  id -> node."""
    return {n["id"]: n for n in data["nodes"]}


def node_exists(data, nid):
    return any(n["id"] == nid for n in data["nodes"])


def find_node(data, nid):
    """Case-insensitive node lookup.  Returns exact-match first, then
    lower-case fallback."""
    for n in data["nodes"]:
        if n["id"] == nid:
            return n
    nid_lower = nid.lower()
    for n in data["nodes"]:
        if n["id"].lower() == nid_lower:
            return n
    return None


def find_node_id(data, nid):
    """Return the actual node id (case-corrected) or None."""
    n = find_node(data, nid)
    return n["id"] if n else None


# ── Merge helper ───────────────────────────────────────────────────────

def merge_nodes(data, keep_id, remove_ids, *,
                new_name=None, add_aliases=None, new_type=None):
    """
    Merge *remove_ids* into *keep_id*.
    - Sum mention_count
    - Union aliases, tags, source_articles (dedup)
    - Redirect all edges; drop self-loops; drop directed duplicates
    - Remove merged nodes from data["nodes"]
    Returns count of actually merged nodes.
    """
    nmap = node_map(data)
    keep_node = nmap.get(keep_id)
    if keep_node is None:
        # Try case-insensitive
        actual = find_node_id(data, keep_id)
        if actual:
            keep_id = actual
            keep_node = nmap[actual]
        else:
            print(f"    [merge] keep node '{keep_id}' not found -- skip")
            return 0

    merged = 0
    for rid in remove_ids:
        nmap = node_map(data)  # refresh after each removal
        actual_rid = rid
        if rid not in nmap:
            actual_rid = find_node_id(data, rid)
        if actual_rid is None or actual_rid not in nmap:
            # Node doesn't exist -- idempotent skip
            continue
        if actual_rid == keep_id:
            continue  # same node

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
            # drop self-loops
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


# ── Edge helpers ───────────────────────────────────────────────────────

def add_edge_if_missing(data, source, target, relation_type, label="",
                        *, check_reverse=False):
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


def change_edge(data, source, target, old_type, *,
                new_source=None, new_target=None, new_type=None,
                new_label=None, delete=False):
    """Find a directed edge and modify it in-place.
    Returns True if the edge was found and changed."""
    for i, link in enumerate(data["links"]):
        if (link["source"] == source and link["target"] == target
                and link["relation_type"] == old_type):
            if delete:
                data["links"].pop(i)
                return True
            if new_source:
                link["source"] = new_source
            if new_target:
                link["target"] = new_target
            if new_type:
                link["relation_type"] = new_type
                link["type"] = new_type
            if new_label:
                link["label"] = new_label
            return True
    return False


def remove_duplicate_edges(data):
    """Remove exact duplicate directed edges.  Keep first occurrence."""
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


# ====================================================================
#  STEP 0 : Fix duplicate-ID nodes (same ID, different name case)
# ====================================================================

def step0_fix_duplicate_ids(data):
    """Merge nodes that share the same ID but differ in name casing.
    Keep the one with higher mention_count."""
    print("\n" + "=" * 70)
    print("STEP 0: Fix duplicate-ID nodes (case variants)")
    print("=" * 70)

    from collections import defaultdict as _dd
    id_groups = _dd(list)
    for i, n in enumerate(data["nodes"]):
        id_groups[n["id"]].append((i, n))

    merged_count = 0
    indices_to_remove = []

    for node_id, group in id_groups.items():
        if len(group) < 2:
            continue
        # Sort by mention_count descending
        group.sort(key=lambda x: x[1].get("mention_count", 0), reverse=True)
        keep_idx, keep_node = group[0]

        for remove_idx, remove_node in group[1:]:
            print(f"    Dedup '{node_id}': keep '{keep_node['name']}'"
                  f"(m={keep_node.get('mention_count',0)}), "
                  f"drop '{remove_node['name']}'"
                  f"(m={remove_node.get('mention_count',0)})")

            # Sum mention_count
            keep_node["mention_count"] = (
                keep_node.get("mention_count", 0)
                + remove_node.get("mention_count", 0)
            )
            # Union aliases
            aliases = set(keep_node.get("aliases", []))
            if remove_node["name"] != keep_node["name"]:
                aliases.add(remove_node["name"])
            aliases.update(remove_node.get("aliases", []))
            aliases.discard(keep_node["name"])
            keep_node["aliases"] = sorted(aliases)

            # Union tags
            tags = set(keep_node.get("tags", []))
            tags.update(remove_node.get("tags", []))
            keep_node["tags"] = sorted(tags)

            # Union source_articles
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

    # Remove in reverse order
    for idx in sorted(set(indices_to_remove), reverse=True):
        data["nodes"].pop(idx)

    # Edges already reference same ID, so no redirect needed.
    # But dedup directed edges in case both duplicate nodes had the
    # same edge.
    dup = remove_duplicate_edges(data)

    print(f"  Merged {merged_count} duplicate-ID pairs, "
          f"removed {dup} dup edges")
    return merged_count


# ====================================================================
#  STEP 1 : Node Merges
# ====================================================================

def step1_node_merges(data):
    print("\n" + "=" * 70)
    print("STEP 1: Node Merges")
    print("=" * 70)
    total = 0

    # -- 1a. New merges (4 groups) --
    print("\n  -- 1a. New merges (4 groups) --")

    # looki + looki公司 -> keep looki (set type=company after merge)
    total += merge_nodes(data, "looki", ["looki公司"], new_type="company")

    # manus + manus-产品 -> keep manus (product)
    total += merge_nodes(data, "manus", ["manus-产品"])

    # 锴杰 + 陈总 -> keep 锴杰
    total += merge_nodes(data, "锴杰", ["陈总"])

    # openclaw + clawdbot -> keep openclaw
    total += merge_nodes(data, "openclaw", ["clawdbot"])

    # -- 1b. Person merges (3 groups) --
    print("\n  -- 1b. Person merges (3 groups) --")
    total += merge_nodes(data, "kaiyi", ["鹤岗凯一", "孙先生"],
                         add_aliases=["鹤岗凯一", "孙先生", "凯一"])
    total += merge_nodes(data, "钟十六", ["钟经纬"])
    total += merge_nodes(data, "travis-kalanick", ["uber创始人"])

    # -- 1c. Company merges (6 groups) --
    print("\n  -- 1c. Company merges (6 groups) --")
    total += merge_nodes(data, "阿里巴巴", ["阿里"], add_aliases=["阿里"])
    total += merge_nodes(data, "阶跃星辰", ["阶跃"], add_aliases=["阶跃"])
    total += merge_nodes(data, "谷歌", ["google"], add_aliases=["Google", "google"])
    total += merge_nodes(data, "商汤科技", ["商汤"], add_aliases=["商汤"])
    total += merge_nodes(data, "红杉资本", ["红杉"], add_aliases=["红杉"])
    total += merge_nodes(data, "千里科技", ["千里"], add_aliases=["千里"])

    # -- 1d. Product merges (10 groups) --
    print("\n  -- 1d. Product merges (10 groups) --")
    total += merge_nodes(data, "qwen", ["千问", "通义大模型", "通义"],
                         add_aliases=["千问", "通义大模型", "通义"])
    total += merge_nodes(data, "阶跃桌面伙伴", ["阶跃桌面助手", "阶跃电脑助手"],
                         add_aliases=["阶跃桌面助手", "阶跃电脑助手"])
    total += merge_nodes(data, "flowith-os", ["flowith"],
                         add_aliases=["flowith", "Flowith"])
    total += merge_nodes(data, "海螺ai", ["海螺"], add_aliases=["海螺"])
    total += merge_nodes(data, "钉钉a1", ["钉钉a1录音卡", "a1"],
                         add_aliases=["a1"])
    total += merge_nodes(data, "chatgpt-deep-research", ["deep-research"],
                         add_aliases=["Deep Research"])
    # manus-agents is a company node -> merge into manus product
    total += merge_nodes(data, "manus", ["manus-agents"])
    total += merge_nodes(data, "kimi", ["k2"], add_aliases=["K2", "Kimi K2"])
    total += merge_nodes(data, "openclaw", ["云端openclaw"],
                         add_aliases=["云端OpenClaw"])
    total += merge_nodes(data, "火山引擎", ["火山"], add_aliases=["火山"])

    # Dedup edges produced by merges
    dup = remove_duplicate_edges(data)
    print(f"\n  Removed {dup} duplicate edges after merges")
    print(f"  Total nodes merged: {total}")
    return total


# ====================================================================
#  STEP 2 : Node Type Corrections
# ====================================================================

def step2_type_corrections(data):
    print("\n" + "=" * 70)
    print("STEP 2: Node Type Corrections")
    print("=" * 70)
    nmap = node_map(data)
    changes = 0

    # product -> company
    for nid in ["plaud", "looki", "youware", "ebay", "myshell", "faceu"]:
        actual = find_node_id(data, nid)
        if actual and nmap[actual]["type"] != "company":
            old = nmap[actual]["type"]
            nmap[actual]["type"] = "company"
            print(f"    {actual}: {old} -> company")
            changes += 1

    # product -> person
    for nid in ["胖猫"]:
        actual = find_node_id(data, nid)
        if actual and nmap[actual]["type"] != "person":
            old = nmap[actual]["type"]
            nmap[actual]["type"] = "person"
            print(f"    {actual}: {old} -> person")
            changes += 1

    # company -> product
    for nid in ["taku"]:
        actual = find_node_id(data, nid)
        if actual and nmap[actual]["type"] != "product":
            old = nmap[actual]["type"]
            nmap[actual]["type"] = "product"
            print(f"    {actual}: {old} -> product")
            changes += 1

    # company -> vc_firm
    for nid in ["a16z", "idg", "高瓴", "锦秋基金", "五源", "红杉资本",
                "金沙江", "idg-90后基金", "benchmark"]:
        actual = find_node_id(data, nid)
        if actual and nmap[actual]["type"] != "vc_firm":
            old = nmap[actual]["type"]
            nmap[actual]["type"] = "vc_firm"
            print(f"    {actual}: {old} -> vc_firm")
            changes += 1

    print(f"  Changed {changes} node types")
    return changes


# ====================================================================
#  STEP 3 : Alias Cleanup + ID Normalization
# ====================================================================

def step3_alias_cleanup(data):
    print("\n" + "=" * 70)
    print("STEP 3: Alias Cleanup + ID Normalization")
    print("=" * 70)
    nmap = node_map(data)
    changes = 0

    # -- 3a. Remove conflicting aliases --
    print("  -- 3a. Remove conflicting aliases --")
    removals = {
        "minimax": lambda a: "胖猫" in a,  # remove any alias containing 胖猫
        "kimi": lambda a: a == "月之暗面",
        "钟十六": lambda a: a == "小登",
        "dingtalk-real": lambda a: a == "Real",
        "shellagent": lambda a: a == "Agent",
        "钉钉a1": lambda a: a == "A1",
        "gemini-cli": lambda a: a == "Gemini",
    }
    for nid, pred in removals.items():
        n = nmap.get(nid)
        if not n:
            continue
        before = list(n.get("aliases", []))
        after = [a for a in before if not pred(a)]
        if len(after) != len(before):
            removed = set(before) - set(after)
            n["aliases"] = after
            print(f"    {nid}: removed aliases {removed}")
            changes += 1

    # -- 3b. Add aliases for ID normalization --
    print("  -- 3b. Add normalisation aliases --")
    additions = {
        "qwen": ["千问"],
        "flowith-os": ["flowith"],
        "阿里巴巴": ["阿里"],
        "阶跃星辰": ["阶跃"],
        "阶跃桌面伙伴": ["阶跃桌面助手"],
        "商汤科技": ["商汤"],
        "谷歌": ["google", "Google"],
        "红杉资本": ["红杉"],
        "kimi": ["k2", "K2"],
        "钉钉a1": ["a1"],
    }
    for nid, new_als in additions.items():
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

    # -- 3c. Rename rokid创始人 -> 祝铭明 --
    print("  -- 3c. Rename generic nodes --")
    n = nmap.get("rokid创始人")
    if n and n.get("name") != "祝铭明":
        n["name"] = "祝铭明"
        n["displayName"] = "祝铭明"
        als = set(n.get("aliases", []))
        als.update(["Misa", "Rokid创始人"])
        als.discard("祝铭明")
        n["aliases"] = sorted(als)
        print(f"    rokid创始人 -> renamed to 祝铭明, aliases={n['aliases']}")
        changes += 1

    # -- 3d. Add aliases to 邪恶意大利人 --
    n = nmap.get("邪恶意大利人")
    if n:
        als = set(n.get("aliases", []))
        before_len = len(als)
        als.update(["Dario Amodei", "Dario"])
        als.discard(n["name"])
        n["aliases"] = sorted(als)
        if len(als) > before_len:
            print(f"    邪恶意大利人: added Dario Amodei / Dario")
            changes += 1

    print(f"  Total alias changes: {changes}")
    return changes


# ====================================================================
#  STEP 4 : Edge Type Corrections
# ====================================================================

def step4_edge_type_corrections(data):
    print("\n" + "=" * 70)
    print("STEP 4: Edge Type Corrections")
    print("=" * 70)
    nmap = node_map(data)
    changes = 0

    # Helper: resolve node id with case-insensitive fallback
    def rid(nid):
        return find_node_id(data, nid)

    # -- 4.1 works_on -> founder_of --
    print("  -- 4.1 works_on -> founder_of --")
    founder_fixes = [
        ("明超平", "youware"),
        ("景鲲", "genspark"),
        ("肖弘", "manus"),
        ("许高", "plaud"),
        ("dereknee", "flowith-os"),
        ("论论创始人", "论论"),
        ("锴杰", "马卡龙"),   # after merge 陈总->锴杰
        ("瓦总", "即刻"),
    ]
    for src, tgt in founder_fixes:
        s = rid(src)
        t = rid(tgt)
        if not s or not t:
            continue
        if change_edge(data, s, t, "works_on", new_type="founder_of"):
            print(f"    {s} -> {t}: works_on -> founder_of")
            changes += 1
        else:
            # Maybe the edge is already founder_of, or doesn't exist
            # Try adding founder_of if missing
            if add_edge_if_missing(data, s, t, "founder_of",
                                   f"{s} founded {t}"):
                print(f"    {s} -> {t}: added founder_of (no works_on found)")
                changes += 1

    # -- 4.2 works_on -> works_at (with potential target change) --
    print("  -- 4.2 works_on -> works_at --")

    # Each tuple: (source, old_target, old_type, new_target_or_None, new_type)
    # Strategy: change the edge if found; else ensure the correct edge exists.
    works_at_fixes = [
        # 杨植麟: target Kimi -> 月之暗面, works_at
        ("杨植麟", "kimi", "works_on", "月之暗面", "works_at"),
        # 付铖 -> MuleRun: works_at
        ("付铖", "mulerun", "works_on", None, "works_at"),
        # wels -> head-ai: works_at
        ("wels", "head-ai", "works_on", None, "works_at"),
        # 钟十六 -> 阶跃桌面伙伴: target -> 阶跃星辰, works_at
        ("钟十六", "阶跃桌面伙伴", "works_on", "阶跃星辰", "works_at"),
        # kaiyi -> manus: works_at
        ("kaiyi", "manus", "works_on", None, "works_at"),
        # peak -> manus: add works_at (keep works_on too)
        # Handled separately below to avoid conflict with Step 5's works_on add
        # 邪恶意大利人 -> claude: target -> anthropic, works_at
        ("邪恶意大利人", "claude", "works_on", "anthropic", "works_at"),
        # 马斯克 -> 推特: works_at
        ("马斯克", "推特", "works_on", None, "works_at"),
        # 张予彤 -> kimi: target -> 月之暗面, works_at
        # Note: data may already have this as works_at to kimi
        ("张予彤", "kimi", "works_on", "月之暗面", "works_at"),
        ("张予彤", "kimi", "works_at", "月之暗面", "works_at"),
        # 许高 -> plaud: works_at (keep founder_of separately)
        ("许高", "plaud", "works_on", None, "works_at"),
        # 约小亚 -> 商业就是这样: works_at
        ("约小亚", "商业就是这样", "works_on", None, "works_at"),
        # 圆脸眼镜哥 -> atoms: works_at
        ("圆脸眼镜哥", "atoms", "works_on", None, "works_at"),
        # 闹闹 -> oiioii: works_at
        ("闹闹", "oiioii", "works_on", None, "works_at"),
    ]

    for src, old_tgt, old_type, new_tgt, new_rel in works_at_fixes:
        s = rid(src)
        ot = rid(old_tgt)
        nt = rid(new_tgt) if new_tgt else None
        if not s or not ot:
            continue
        found = False
        for link in data["links"]:
            if (link["source"] == s and link["target"] == ot
                    and link["relation_type"] == old_type):
                if nt:
                    link["target"] = nt
                link["relation_type"] = new_rel
                link["type"] = new_rel
                print(f"    {s} -> {ot}: {old_type} -> "
                      f"{s} -> {nt or ot}: {new_rel}")
                changes += 1
                found = True
                break
        if not found:
            # Edge doesn't exist with old_type -- ensure the correct edge exists
            final_tgt = nt or ot
            if final_tgt and add_edge_if_missing(data, s, final_tgt, new_rel,
                                                  f"{s} works at {final_tgt}"):
                print(f"    {s} -> {final_tgt}: added {new_rel} "
                      f"(no {old_type} to {ot} found)")
                changes += 1

    # peak -> manus: add works_at (keep existing works_on)
    s = rid("peak")
    t = rid("manus")
    if s and t:
        if add_edge_if_missing(data, s, t, "works_at",
                               "Peak在Manus工作"):
            print(f"    peak -> manus: added works_at")
            changes += 1

    # 明超平 -> works_at 月之暗面 (separate edge)
    s = rid("明超平")
    t = rid("月之暗面")
    if s and t:
        if add_edge_if_missing(data, s, t, "works_at",
                               "明超平在月之暗面工作"):
            print(f"    明超平 -> 月之暗面: added works_at")
            changes += 1

    # -- 4.3 mentors -> invests_in --
    print("  -- 4.3 mentors -> invests_in --")
    mentor_to_invest = [
        ("百度", "张月光"),
        ("刘元", "肖弘"),
        ("锦秋基金", "王登科"),
        ("idg", "孙宇晨"),
        ("idg", "齐俊元"),
    ]
    for src, tgt in mentor_to_invest:
        s = rid(src)
        t = rid(tgt)
        if not s or not t:
            continue
        if change_edge(data, s, t, "mentors", new_type="invests_in"):
            print(f"    {s} -> {t}: mentors -> invests_in")
            changes += 1

    # -- 4.4 founder_of where target is product --
    print("  -- 4.4 founder_of target-is-product fixes --")
    # 张小龙 -> 微信: founder_of -> works_on
    s = rid("张小龙")
    t = rid("微信")
    if s and t:
        if change_edge(data, s, t, "founder_of", new_type="works_on"):
            print(f"    张小龙 -> 微信: founder_of -> works_on")
            changes += 1

    # -- 4.5 develops where source is product -> change to company --
    print("  -- 4.5 develops source-is-product fixes --")
    # kimi -> kimi-api / kimi-claw / kimi-code: source -> 月之暗面
    for tgt_id in ["kimi-api", "kimi-claw", "kimi-code"]:
        s = rid("kimi")
        t = rid(tgt_id)
        ns = rid("月之暗面")
        if not s or not t or not ns:
            continue
        # Check if 月之暗面 -> target develops already exists
        dk_new = (ns, t, "develops")
        already = any(directed_key(l) == dk_new for l in data["links"])
        if already:
            # Delete the kimi -> target edge as duplicate
            if change_edge(data, s, t, "develops", delete=True):
                print(f"    kimi -> {tgt_id}: deleted (月之暗面 already develops)")
                changes += 1
        else:
            if change_edge(data, s, t, "develops", new_source=ns):
                print(f"    kimi -> {tgt_id}: source changed to 月之暗面")
                changes += 1

    # faceu -> 剪映: source -> 字节跳动
    s = rid("faceu")
    t = rid("剪映")
    ns = rid("字节跳动")
    if s and t and ns:
        dk_new = (ns, t, "develops")
        already = any(directed_key(l) == dk_new for l in data["links"])
        if already:
            if change_edge(data, s, t, "develops", delete=True):
                print(f"    faceu -> 剪映: deleted (字节跳动 already develops)")
                changes += 1
        else:
            if change_edge(data, s, t, "develops", new_source=ns):
                print(f"    faceu -> 剪映: source changed to 字节跳动")
                changes += 1

    # -- 4.6 Other edge fixes --
    print("  -- 4.6 Other edge fixes --")

    # 王登科 -> 独响: develops -> founder_of
    s = rid("王登科")
    t = rid("独响")
    if s and t:
        if change_edge(data, s, t, "develops", new_type="founder_of"):
            print(f"    王登科 -> 独响: develops -> founder_of")
            changes += 1

    # 孙洋 -> looki: works_on -> works_at  (after merge looki is company)
    s = rid("孙洋")
    t = rid("looki")
    if s and t:
        if change_edge(data, s, t, "works_on", new_type="works_at"):
            print(f"    孙洋 -> looki: works_on -> works_at")
            changes += 1

    # 月之暗面 -> 明超平: delete (could be collaborates_with or invests_in)
    s_m = rid("月之暗面")
    t_m = rid("明超平")
    if s_m and t_m:
        deleted = False
        for try_type in ["collaborates_with", "invests_in"]:
            if change_edge(data, s_m, t_m, try_type, delete=True):
                print(f"    月之暗面 -> 明超平: deleted {try_type}")
                changes += 1
                deleted = True
                break
        if not deleted:
            print(f"    月之暗面 -> 明超平: no edge found to delete")

    # 马卡龙 -> 反诈助手: the edge is actually 反诈助手 -> 马卡龙 integrates_with
    # Change to: 马卡龙 -> 反诈助手 develops
    s = rid("反诈助手")
    t = rid("马卡龙")
    if s and t:
        if change_edge(data, s, t, "integrates_with",
                       new_source=rid("马卡龙"), new_target=rid("反诈助手"),
                       new_type="develops",
                       new_label="马卡龙开发反诈助手"):
            print(f"    反诈助手 -> 马卡龙: integrates_with -> "
                  f"马卡龙 -> 反诈助手: develops")
            changes += 1

    # Robin (李彦宏): add founder_of -> 百度
    s = rid("robin")
    t = rid("百度")
    if s and t:
        if add_edge_if_missing(data, s, t, "founder_of",
                               "李彦宏创立百度"):
            print(f"    robin -> 百度: added founder_of")
            changes += 1

    # Cleanup any duplicates created
    dup = remove_duplicate_edges(data)
    if dup:
        print(f"  Removed {dup} duplicate edges after fixes")

    print(f"  Total edge changes: {changes}")
    return changes


# ====================================================================
#  STEP 5 : Add Missing Edges
# ====================================================================

def step5_add_missing_edges(data):
    print("\n" + "=" * 70)
    print("STEP 5: Add Missing Edges")
    print("=" * 70)
    count = 0

    def rid(nid):
        return find_node_id(data, nid)

    # -- 5.1 User-specified --
    print("  -- 5.1 User-specified --")
    user_edges = [
        ("邪恶意大利人", "马斯克", "competes_with", "Anthropic与xAI竞争"),
        ("邪恶意大利人", "sam-altman", "competes_with", "Anthropic与OpenAI竞争"),
        ("钟十六", "阶跃星辰", "works_at", "钟十六在阶跃星辰工作"),
        ("钟十六", "印奇", "collaborates_with", "钟十六与印奇合作"),
        ("wels", "杨洁", "collaborates_with", "Wels与杨洁合作"),
    ]
    for src, tgt, rel, label in user_edges:
        s = rid(src)
        t = rid(tgt)
        if s and t:
            if add_edge_if_missing(data, s, t, rel, label,
                                   check_reverse=(rel in {
                                       "competes_with", "collaborates_with",
                                       "compares_to", "co_founded"})):
                print(f"    + {s} --{rel}--> {t}")
                count += 1

    # -- 5.2 Description-inferred founder_of/works_at --
    print("  -- 5.2 Description-inferred founder_of/works_at --")
    inferred = [
        ("sam-altman", "openai", "founder_of", "Sam Altman创立OpenAI"),
        ("乔布斯", "苹果", "founder_of", "乔布斯创立苹果"),
        ("吴永辉", "谷歌", "works_at", "吴永辉在谷歌工作"),
        ("吴泳铭", "阿里巴巴", "works_at", "吴泳铭在阿里巴巴工作"),
        ("孙洋", "looki", "founder_of", "孙洋创立Looki"),
        ("橘子", "listenhub", "founder_of", "橘子创立ListenHub"),
        ("王登科", "独响", "founder_of", "王登科创立独响"),
        ("玉伯", "youmind", "founder_of", "玉伯创立YouMind"),
        ("戴宗宏", "百川智能", "co_founded", "戴宗宏联合创立百川智能"),
        ("谷雪梅", "零一万物", "co_founded", "谷雪梅联合创立零一万物"),
        ("erlich", "proma", "works_on", "Erlich参与Proma"),
        ("peak", "manus", "works_on", "Peak参与Manus"),
        ("邪恶意大利人", "anthropic", "founder_of", "Dario Amodei创立Anthropic"),
        ("郭列", "脸萌", "founder_of", "郭列创立脸萌"),
        ("杨通", "千里科技", "founder_of", "杨通创立千里科技"),
        ("闫俊杰", "minimax", "founder_of", "闫俊杰创立MiniMax"),
    ]
    for src, tgt, rel, label in inferred:
        s = rid(src)
        t = rid(tgt)
        if s and t:
            check_rev = rel in {"co_founded", "collaborates_with",
                                "competes_with", "compares_to"}
            if add_edge_if_missing(data, s, t, rel, label,
                                   check_reverse=check_rev):
                print(f"    + {s} --{rel}--> {t}")
                count += 1

    # -- 5.3 Missing parent-child develops --
    print("  -- 5.3 Missing parent-child develops --")
    develops = [
        ("openai", "sora", "OpenAI开发Sora"),
        ("谷歌", "gemini", "谷歌开发Gemini"),
        ("谷歌", "google-deepmind", "谷歌旗下Google DeepMind"),
        ("苹果", "siri", "苹果开发Siri"),
        ("腾讯", "微信", "腾讯开发微信"),
        ("腾讯", "绝悟-ai", "腾讯开发绝悟AI"),
        ("腾讯", "腾讯-ai-lab", "腾讯旗下AI Lab"),
        ("字节跳动", "火山引擎", "字节跳动开发火山引擎"),
        ("字节跳动", "抖音极速版", "字节跳动开发抖音极速版"),
        ("阿里巴巴", "淘宝", "阿里巴巴开发淘宝"),
    ]
    for src, tgt, label in develops:
        s = rid(src)
        t = rid(tgt)
        if s and t:
            if add_edge_if_missing(data, s, t, "develops", label):
                print(f"    + {s} --develops--> {t}")
                count += 1

    # -- 5.4 Other missing edges from articles --
    print("  -- 5.4 Other missing edges --")
    other = [
        ("阿里巴巴", "杨植麟", "invests_in", "阿里巴巴投资杨植麟/月之暗面"),
        ("五源", "雷军", "invests_in", "五源投资雷军"),
        ("idg-90后基金", "郭列", "invests_in", "IDG 90后基金投资郭列"),
        ("特朗普", "马斯克", "collaborates_with", "特朗普与马斯克合作"),
        ("刘芹", "雷军", "collaborates_with", "刘芹与雷军合作"),
        ("peak", "肖弘", "co_founded", "Peak与肖弘联合创立Manus"),
    ]
    for src, tgt, rel, label in other:
        s = rid(src)
        t = rid(tgt)
        if s and t:
            check_rev = rel in {"co_founded", "collaborates_with",
                                "competes_with", "compares_to"}
            if add_edge_if_missing(data, s, t, rel, label,
                                   check_reverse=check_rev):
                print(f"    + {s} --{rel}--> {t}")
                count += 1

    print(f"  Total edges added: {count}")
    return count


# ====================================================================
#  STEP 6 : Bidirectional Edge Completion
# ====================================================================

def step6_bidirectional_completion(data):
    print("\n" + "=" * 70)
    print("STEP 6: Bidirectional Edge Completion (competes_with)")
    print("=" * 70)

    existing_dir = directed_keys(data["links"])
    new_edges = []

    for link in list(data["links"]):
        if link["relation_type"] != "competes_with":
            continue
        reverse_key = (link["target"], link["source"], "competes_with")
        if reverse_key not in existing_dir:
            rev = make_edge(link["target"], link["source"],
                            "competes_with", link.get("label", ""))
            new_edges.append(rev)
            existing_dir.add(reverse_key)

    data["links"].extend(new_edges)
    print(f"  Added {len(new_edges)} reverse competes_with edges")

    # Final dedup pass
    dup = remove_duplicate_edges(data)
    if dup:
        print(f"  Removed {dup} duplicates after bidirectional completion")

    return len(new_edges)


# ====================================================================
#  STEP 7 : (Orphan Node Improvement -- skipped per spec)
# ====================================================================

def step7_orphan_improvement(data):
    print("\n" + "=" * 70)
    print("STEP 7: Orphan Node Improvement (skipped per spec)")
    print("=" * 70)
    # Count orphans for stats
    connected = set()
    for link in data["links"]:
        connected.add(link["source"])
        connected.add(link["target"])
    orphans = [n for n in data["nodes"] if n["id"] not in connected]
    print(f"  {len(orphans)} orphan nodes (not addressed)")
    return 0


# ====================================================================
#  STEP 8 : Recalculate degree + composite_weight
# ====================================================================

def step8_recalculate(data):
    print("\n" + "=" * 70)
    print("STEP 8: Recalculate degree + composite_weight")
    print("=" * 70)

    # 1. Degree
    degree = defaultdict(int)
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

    # 3. composite_weight
    max_mention = max((n.get("mention_count", 0) for n in data["nodes"]),
                      default=1) or 1
    max_degree = max((n.get("degree", 0) for n in data["nodes"]),
                     default=1) or 1
    max_article = max((n.get("article_count", 0) for n in data["nodes"]),
                      default=1) or 1

    for n in data["nodes"]:
        nm = n.get("mention_count", 0) / max_mention
        nd = n.get("degree", 0) / max_degree
        na = n.get("article_count", 0) / max_article
        cw = 0.35 * nd + 0.40 * nm + 0.25 * na
        n["composite_weight"] = round(cw, 4)

    print(f"  max_mention={max_mention}, max_degree={max_degree}, "
          f"max_article={max_article}")

    # Top 10
    top = sorted(data["nodes"],
                 key=lambda n: n["composite_weight"], reverse=True)[:10]
    for n in top:
        print(f"    {n['name']:20s}  cw={n['composite_weight']:.4f}  "
              f"(deg={n['degree']}, men={n['mention_count']}, "
              f"art={n['article_count']})")


# ====================================================================
#  STEP 9 : Rebuild Leaderboards + Display Registry
# ====================================================================

def step9_rebuild_leaderboards_and_registry(data):
    print("\n" + "=" * 70)
    print("STEP 9: Rebuild Leaderboards + Display Registry")
    print("=" * 70)

    nmap = node_map(data)
    nodes = data["nodes"]

    # Determine which persons have founder_of edges
    founder_persons = set()
    for link in data["links"]:
        if link["relation_type"] in ("founder_of", "co_founded"):
            src_node = nmap.get(link["source"])
            if src_node and src_node["type"] == "person":
                founder_persons.add(link["source"])

    # Build leaderboard segments
    products = sorted(
        [n for n in nodes if n["type"] == "product"],
        key=lambda n: n.get("composite_weight", 0), reverse=True
    )[:20]

    founders = sorted(
        [n for n in nodes if n["type"] == "person"
         and n["id"] in founder_persons],
        key=lambda n: n.get("composite_weight", 0), reverse=True
    )[:20]

    vcs = sorted(
        [n for n in nodes if n["type"] == "vc_firm"],
        key=lambda n: n.get("composite_weight", 0), reverse=True
    )  # all vc_firms

    companies = sorted(
        [n for n in nodes if n["type"] == "company"],
        key=lambda n: n.get("composite_weight", 0), reverse=True
    )[:20]

    def make_entry(rank, n):
        desc = n.get("description", "")
        return {
            "rank": rank,
            "nodeId": n["id"],
            "name": n.get("name", n["id"]),
            "displayName": n.get("displayName", n.get("name", n["id"])),
            "type": n["type"],
            "degree": n.get("degree", 0),
            "mention_count": n.get("mention_count", 0),
            "article_count": n.get("article_count", 0),
            "composite_weight": n.get("composite_weight", 0),
            "description": desc[:50] if desc else "",
            # Preserve visual info from display registry if present
            "visualMode": n.get("visualMode", "text"),
            "asset": n.get("asset", None),
            "featured": n.get("featured", False),
            "leaderboardSegments": [],  # will be filled below
        }

    segments = {
        "products": [make_entry(i + 1, n) for i, n in enumerate(products)],
        "founders": [make_entry(i + 1, n) for i, n in enumerate(founders)],
        "vcs": [make_entry(i + 1, n) for i, n in enumerate(vcs)],
        "companies": [make_entry(i + 1, n) for i, n in enumerate(companies)],
    }

    # Build reverse mapping: nodeId -> list of segments
    node_segments = defaultdict(list)
    for seg_name, entries in segments.items():
        for e in entries:
            node_segments[e["nodeId"]].append(seg_name)

    # Fill leaderboardSegments
    for seg_name, entries in segments.items():
        for e in entries:
            e["leaderboardSegments"] = node_segments[e["nodeId"]]

    lb = {
        "generatedAt": datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"),
        "segments": segments,
    }
    save_json(LEADERBOARD_PATH, lb)

    for seg_name, entries in segments.items():
        print(f"  {seg_name}: {len(entries)} entries")
        for e in entries[:5]:
            print(f"    #{e['rank']} {e['name']} "
                  f"(cw={e['composite_weight']:.4f})")

    # ── Display Registry ──
    print("\n  -- Update display_registry.json --")
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


# ====================================================================
#  MAIN
# ====================================================================

def main():
    print("=" * 70)
    print("enrich_graph.py  --  Phase 1 Knowledge Graph Data Overhaul")
    print("=" * 70)

    data = load_json(GRAPH_PATH)
    orig_nodes = len(data["nodes"])
    orig_links = len(data["links"])
    print(f"\nLoaded: {orig_nodes} nodes, {orig_links} links")
    print(f"Node types: {dict(Counter(n['type'] for n in data['nodes']))}")

    # Step 0: Fix duplicate-ID nodes (same ID, different name case)
    s0 = step0_fix_duplicate_ids(data)

    # Step 1: Node Merges
    s1 = step1_node_merges(data)

    # Step 2: Node Type Corrections
    s2 = step2_type_corrections(data)

    # Step 3: Alias Cleanup + ID Normalization
    s3 = step3_alias_cleanup(data)

    # Step 4: Edge Type Corrections
    s4 = step4_edge_type_corrections(data)

    # Step 5: Add Missing Edges
    s5 = step5_add_missing_edges(data)

    # Step 6: Bidirectional Edge Completion
    s6 = step6_bidirectional_completion(data)

    # Step 7: Orphan Node Improvement (skipped)
    step7_orphan_improvement(data)

    # Step 8: Recalculate degree + composite_weight
    step8_recalculate(data)

    # Save graph
    save_json(GRAPH_PATH, data)

    # Step 9: Rebuild Leaderboards + Display Registry
    step9_rebuild_leaderboards_and_registry(data)

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
    print(f"  Step 0 (dedup IDs):      {s0} duplicate-ID pairs merged")
    print(f"  Step 1 (merges):         {s1} nodes merged")
    print(f"  Step 2 (type fixes):     {s2} nodes changed")
    print(f"  Step 3 (alias cleanup):  {s3} changes")
    print(f"  Step 4 (edge fixes):     {s4} edge changes")
    print(f"  Step 5 (missing edges):  {s5} edges added")
    print(f"  Step 6 (bidirectional):  {s6} reverse edges added")


if __name__ == "__main__":
    main()
