"""
graph_builder.py -- Aggregate per-article extraction artifacts into unified graphs.

Takes individual article extractions from data/extracted/{id}.json and produces:
  - data/graph/canonical_full.json  (all entities, no pruning)
  - data/graph/canonical.json       (pruned: orphan nodes + weak edges removed)

Key functions:
  - normalize_article_extraction()  -- Standardize raw Gemini output for one article
  - aggregate_article_artifacts()   -- Merge all articles into a full graph
  - derive_canonical_graph()        -- Prune weak edges and orphan nodes
  - build_graph_bundle_from_manifest() -- Orchestrate the full pipeline
"""
from __future__ import annotations

from collections import Counter, defaultdict

from graph_utils import (
    TYPE_OVERRIDES,
    canonicalize_name,
    count_mentions_in_text,
    entity_variants,
    normalize_entity,
    normalize_relation_type,
    normalize_tag,
    pick_best_description,
    relation_strength,
    sanitize_id,
)
from overrides import EXCLUDED_ARTICLES
from pipeline_state import (
    CANONICAL_FULL_GRAPH_FILE,
    CANONICAL_GRAPH_FILE,
    EXTRACTED_DIR,
    GRAPH_SCHEMA_VERSION,
    MODEL_NAME,
    PROMPT_VERSION,
    PROJECT_ROOT,
    article_markdown_link,
    article_permalink,
    load_json_file,
    missing_article_ids,
    ready_article_ids,
    save_json_file,
)

SYMMETRIC_RELATIONS = {"competes_with", "compares_to", "partners_with", "related", "co_founded", "collaborates_with", "integrates_with"}
LOW_SIGNAL_MENTION_THRESHOLD = 2
MIN_GRAPH_NODE_MENTION_COUNT = 2
# Effective weight threshold for canonical graph edge pruning
EDGE_STRENGTH_PRUNE_THRESHOLD = 3

BORING_RELATED_PATTERNS = (
    "作者使用",
    "研究",
    "资料",
    "稿件",
    "搜集",
    "搜索",
    "处理",
)


def _clean_description(text: object, max_len: int) -> str:
    raw = str(text or "").strip()
    if not raw:
        return ""
    return raw if len(raw) <= max_len else raw[:max_len] + "..."


def _build_alias_lookup(entity_records: dict[str, dict]) -> dict[str, str]:
    lookup = {}
    for canonical_name, record in entity_records.items():
        lookup[canonical_name.casefold()] = canonical_name
        for alias in record["aliases"]:
            lookup[alias.casefold()] = canonical_name
    return lookup


def _name_in_title(title: str, candidates: list[str]) -> bool:
    folded_title = (title or "").casefold()
    return any(candidate and candidate.casefold() in folded_title for candidate in candidates)


def _prune_low_signal_entities(article: dict, entities: list[dict], relationships: list[dict]) -> tuple[list[dict], list[dict], dict[str, str]]:
    dropped: dict[str, str] = {}
    current_entities = entities
    current_relationships = relationships

    while True:
        relation_types_by_name: dict[str, set[str]] = defaultdict(set)
        for relationship in current_relationships:
            relation_types_by_name[str(relationship["source"])].add(str(relationship["relation_type"]))
            relation_types_by_name[str(relationship["target"])].add(str(relationship["relation_type"]))

        next_entities = []
        next_dropped: dict[str, str] = {}
        for entity in current_entities:
            mentions = int(entity.get("mention_count", 0))
            aliases = [str(alias).strip() for alias in entity.get("aliases", []) if str(alias).strip()]
            in_title = _name_in_title(article.get("title", ""), [entity["name"], *aliases])
            relation_types = relation_types_by_name.get(entity["name"], set())
            has_specific_relation = any(relation_type != "related" for relation_type in relation_types)

            reason = None
            if entity["name"] == article.get("author") and not in_title and mentions == 0:
                reason = "article-author"
            elif mentions == 0 and not in_title:
                reason = "not-in-body"
            elif mentions < LOW_SIGNAL_MENTION_THRESHOLD and not in_title and not has_specific_relation:
                reason = "low-signal"

            if reason:
                next_dropped[entity["name"]] = reason
                continue

            next_entities.append(entity)

        valid_names = {entity["name"] for entity in next_entities}
        next_relationships = [
            relationship
            for relationship in current_relationships
            if relationship["source"] in valid_names and relationship["target"] in valid_names
        ]

        dropped.update(next_dropped)
        if len(next_entities) == len(current_entities) and len(next_relationships) == len(current_relationships):
            return next_entities, next_relationships, dropped

        current_entities = next_entities
        current_relationships = next_relationships


def _keep_relationship(relationship: dict) -> bool:
    relation_type = str(relationship.get("relation_type", "related"))
    label = str(relationship.get("label", "")).strip()
    if relation_type != "related":
        return True
    return not any(pattern in label for pattern in BORING_RELATED_PATTERNS)


def _article_reference(article: dict) -> dict:
    article_id = str(article.get("id", "")).strip()
    path = str(article.get("path", "")).strip()
    return {
        "article_id": article_id,
        "title": str(article.get("title", "")).strip(),
        "date": str(article.get("date", "")).strip(),
        "path": path,
        "permalink": article_permalink(article_id),
        "markdown_link": article_markdown_link(path),
    }


def normalize_article_extraction(article: dict, raw_result: dict) -> dict:
    entity_records: dict[str, dict] = {}

    for raw_entity in raw_result.get("entities", []):
        raw_name = str(raw_entity.get("name", "")).strip()
        normalized = normalize_entity(raw_name, raw_entity.get("type"), raw_entity.get("description"))
        if not normalized:
            continue
        canonical_name, entity_type = normalized

        record = entity_records.setdefault(canonical_name, {
            "descriptions": [],
            "type_votes": [],
            "aliases": set(),
            "raw_tags": [],
            "mention_count": 0,
        })
        record["type_votes"].append(entity_type)
        record["descriptions"].append(str(raw_entity.get("description", "")))
        record["mention_count"] = max(
            record["mention_count"],
            count_mentions_in_text(article["text"], entity_variants(canonical_name)),
        )
        if raw_name and raw_name != canonical_name:
            record["aliases"].add(raw_name)
        for alias in raw_entity.get("aliases", []):
            alias_text = str(alias).strip()
            if alias_text and alias_text != canonical_name:
                record["aliases"].add(alias_text)
        record["raw_tags"].extend(raw_entity.get("tags", []))

    entity_names = set(entity_records)
    alias_lookup = _build_alias_lookup(entity_records)

    entities = []
    for canonical_name, record in entity_records.items():
        tags = []
        for raw_tag in record["raw_tags"]:
            tag = normalize_tag(raw_tag, entity_names)
            if tag and tag not in tags:
                tags.append(tag)
        entities.append({
            "id": sanitize_id(canonical_name),
            "name": canonical_name,
            "type": Counter(record["type_votes"]).most_common(1)[0][0],
            "description": pick_best_description(record["descriptions"], max_len=220),
            "mention_count": int(record["mention_count"]),
            "aliases": sorted(record["aliases"]),
            "tags": tags,
        })

    relationship_records: dict[tuple[str, str, str], dict] = {}

    def resolve_entity_name(value: object) -> str:
        raw = str(value or "").strip()
        if not raw:
            return ""
        canonical = alias_lookup.get(raw.casefold())
        if canonical:
            return canonical
        canonical = canonicalize_name(raw)
        return canonical if canonical in entity_names else ""

    for raw_relationship in raw_result.get("relationships", []):
        source_name = resolve_entity_name(raw_relationship.get("source"))
        target_name = resolve_entity_name(raw_relationship.get("target"))
        if not source_name or not target_name or source_name == target_name:
            continue

        relation_type = normalize_relation_type(raw_relationship.get("type"))
        confidence = str(raw_relationship.get("confidence", "medium")).strip().lower()
        if confidence not in ("high", "medium", "low"):
            confidence = "medium"
        if relation_type in SYMMETRIC_RELATIONS:
            source_name, target_name = sorted((source_name, target_name))
        key = (source_name, target_name, relation_type)

        record = relationship_records.setdefault(key, {
            "source": source_name,
            "target": target_name,
            "relation_type": relation_type,
            "labels": [],
            "weight": 0,
        })
        record["weight"] += 1
        confidence_rank = {"high": 3, "medium": 2, "low": 1}
        record.setdefault("best_confidence", "low")
        if confidence_rank.get(confidence, 0) > confidence_rank.get(record["best_confidence"], 0):
            record["best_confidence"] = confidence
        description = _clean_description(raw_relationship.get("description"), 180)
        if description:
            record["labels"].append(description)

    relationships = []
    for record in relationship_records.values():
        label = record["labels"][0] if record["labels"] else record["relation_type"]
        relationship = {
            "source": record["source"],
            "target": record["target"],
            "relation_type": record["relation_type"],
            "label": label,
            "weight": record["weight"],
            "strength": relation_strength(record["relation_type"]),
            "confidence": record.get("best_confidence", "medium"),
        }
        if _keep_relationship(relationship):
            relationships.append(relationship)

    entities, relationships, dropped = _prune_low_signal_entities(article, entities, relationships)
    for entity in entities:
        entity["mention_count"] = max(int(entity.get("mention_count", 0)), 1)

    relationships.sort(key=lambda item: (-item["weight"], item["relation_type"], item["source"], item["target"]))
    entities.sort(key=lambda item: (-item["mention_count"], item["name"]))

    return {
        "article": {
            "id": article["id"],
            "title": article["title"],
            "path": article["path"],
            "date": article.get("date", ""),
            "author": article.get("author", ""),
            "content_hash": article["content_hash"],
        },
        "entities": entities,
        "relationships": relationships,
        "metadata": {
            "model": MODEL_NAME,
            "prompt_version": PROMPT_VERSION,
            "entity_count": len(entities),
            "relationship_count": len(relationships),
            "pruned_entities": [
                {"name": name, "reason": reason}
                for name, reason in sorted(dropped.items())
            ],
        },
    }


def load_article_artifacts(article_ids: list[str] | None = None) -> list[dict]:
    selected = set(article_ids or [])
    artifacts = []
    for path in sorted(EXTRACTED_DIR.glob("*.json")):
        article_id = path.stem
        if article_id in EXCLUDED_ARTICLES:
            continue
        if selected and article_id not in selected:
            continue
        payload = load_json_file(path, None)
        if payload:
            artifacts.append(payload)
    return artifacts


def aggregate_article_artifacts(
    artifacts: list[dict],
    expected_article_count: int | None = None,
    missing_ids: list[str] | None = None,
) -> dict:
    entity_agg: dict[str, dict] = {}
    link_agg: dict[tuple[str, str, str], dict] = {}

    for artifact in artifacts:
        article = artifact.get("article", {})
        article_id = str(article.get("id", "")).strip()
        if not article_id:
            continue

        article_reference = _article_reference(article)
        article_entity_ids = set()

        for entity in artifact.get("entities", []):
            name = str(entity.get("name", "")).strip()
            if not name:
                continue

            mention_count = max(int(entity.get("mention_count", 1)), 1)
            # Title mention bonus: +5 per article if entity appears in title
            title = article.get("title", "")
            entity_aliases = [str(a).strip() for a in entity.get("aliases", []) if str(a).strip()]
            if _name_in_title(title, [name, *entity_aliases]):
                mention_count += 5
            node_id = sanitize_id(name)
            article_entity_ids.add(node_id)
            record = entity_agg.setdefault(node_id, {
                "best_name": name,
                "type_votes": [],
                "descriptions": [],
                "aliases": set(),
                "tags": set(),
                "mention_count": 0,
                "article_ids": set(),
                "source_articles": {},
            })
            # Track name variants; prefer the variant with more uppercase chars
            if name != record["best_name"]:
                record["aliases"].add(name)
                if sum(1 for c in name if c.isupper()) > sum(1 for c in record["best_name"] if c.isupper()):
                    record["aliases"].discard(name)
                    record["aliases"].add(record["best_name"])
                    record["best_name"] = name
            record["type_votes"].append(entity.get("type", "product"))
            record["descriptions"].append(entity.get("description", ""))
            record["aliases"].update(str(alias).strip() for alias in entity.get("aliases", []) if str(alias).strip())
            record["tags"].update(str(tag).strip() for tag in entity.get("tags", []) if str(tag).strip())
            record["mention_count"] += mention_count
            record["article_ids"].add(article_id)

            source_article = record["source_articles"].setdefault(article_id, {
                **article_reference,
                "mention_count": 0,
            })
            source_article["mention_count"] += mention_count

        for relationship in artifact.get("relationships", []):
            source_name = str(relationship.get("source", "")).strip()
            target_name = str(relationship.get("target", "")).strip()
            relation_type = str(relationship.get("relation_type", "related")).strip() or "related"
            source_id = sanitize_id(source_name)
            target_id = sanitize_id(target_name)
            if source_id not in article_entity_ids or target_id not in article_entity_ids:
                continue

            if relation_type in SYMMETRIC_RELATIONS:
                source_id, target_id = sorted((source_id, target_id))
            key = (source_id, target_id, relation_type)
            record = link_agg.setdefault(key, {
                "labels": Counter(),
                "weight": 0,
                "article_ids": set(),
                "evidence_by_article": {},
            })
            label = str(relationship.get("label", relation_type)).strip() or relation_type
            weight = max(int(relationship.get("weight", 1)), 1)
            record["labels"][label] += 1
            record["weight"] += weight
            record.setdefault("strength", relation_strength(relation_type))
            record["article_ids"].add(article_id)

            evidence = record["evidence_by_article"].setdefault(article_id, {
                "article_id": article_reference["article_id"],
                "title": article_reference["title"],
                "permalink": article_reference["permalink"],
                "markdown_link": article_reference["markdown_link"],
                "path": article_reference["path"],
                "date": article_reference["date"],
                "labels": Counter(),
                "weight": 0,
            })
            evidence["labels"][label] += 1
            evidence["weight"] += weight

    nodes = []
    for node_id, record in entity_agg.items():
        name = record["best_name"]
        source_articles = sorted(
            record["source_articles"].values(),
            key=lambda item: (int(item["mention_count"]), item["date"], item["article_id"]),
            reverse=True,
        )
        voted_type = Counter(record["type_votes"]).most_common(1)[0][0]
        final_type = TYPE_OVERRIDES.get(name, voted_type)
        nodes.append({
            "id": node_id,
            "name": name,
            "type": final_type,
            "description": pick_best_description(record["descriptions"], max_len=220),
            "mention_count": record["mention_count"],
            "article_count": len(record["article_ids"]),
            "aliases": sorted(alias for alias in record["aliases"] if alias != name),
            "tags": sorted(tag for tag in record["tags"] if tag != name),
            "references": len(record["article_ids"]),
            "source_article_count": len(source_articles),
            "source_articles": source_articles,
        })

    nodes.sort(key=lambda item: (-item["mention_count"], -item["article_count"], item["name"]))

    links = []
    for (source_id, target_id, relation_type), record in link_agg.items():
        evidences = []
        for evidence in record["evidence_by_article"].values():
            evidences.append({
                "article_id": evidence["article_id"],
                "title": evidence["title"],
                "permalink": evidence["permalink"],
                "markdown_link": evidence["markdown_link"],
                "path": evidence["path"],
                "date": evidence["date"],
                "label": evidence["labels"].most_common(1)[0][0],
                "weight": evidence["weight"],
            })
        evidences.sort(key=lambda item: (int(item["weight"]), item["date"], item["article_id"]), reverse=True)

        strength = record.get("strength", relation_strength(relation_type))
        effective_weight = strength * len(record["article_ids"]) + record["weight"]
        links.append({
            "source": source_id,
            "target": target_id,
            "relation_type": relation_type,
            "type": relation_type,
            "label": record["labels"].most_common(1)[0][0],
            "weight": record["weight"],
            "strength": strength,
            "effective_weight": effective_weight,
            "article_count": len(record["article_ids"]),
            "evidence_articles": sorted(record["article_ids"]),
            "evidences": evidences,
        })

    links.sort(key=lambda item: (-item["weight"], item["relation_type"], item["source"], item["target"]))

    return {
        "nodes": nodes,
        "links": links,
        "metadata": {
            "source": "incremental-article-artifacts",
            "layer": "canonical_full",
            "articleCount": expected_article_count if expected_article_count is not None else len(artifacts),
            "includedArticleCount": len(artifacts),
            "missingArticleIds": missing_ids or [],
            "isPartial": bool(missing_ids),
            "graphSchemaVersion": GRAPH_SCHEMA_VERSION,
            "entityTypes": ["company", "product", "person"],
            "pruning": {
                "rule": "none",
                "minimumMentionCount": 0,
                "removedNodeCount": 0,
            },
            "weighting": {
                "node": "mention_count",
                "edge": "effective_weight",
                "edgeStrengthTiers": {
                    "tier1_structural": 5,
                    "tier2_operational": 4,
                    "tier3_significant": 3,
                    "tier4_comparative": 2,
                    "tier5_catchall": 1,
                },
            },
        },
    }


def derive_canonical_graph(full_graph: dict) -> dict:
    full_nodes = full_graph.get("nodes", [])
    full_links = full_graph.get("links", [])

    # Keep all nodes with mention_count >= 1 (only drop zero-mention ghosts)
    retained_nodes = [
        node
        for node in full_nodes
        if int(node.get("mention_count", 0)) >= 1
    ]
    retained_nodes.sort(key=lambda item: (-item["mention_count"], -item["article_count"], item["name"]))

    valid_ids = {node["id"] for node in retained_nodes}
    retained_links = [
        link
        for link in full_links
        if link.get("source") in valid_ids and link.get("target") in valid_ids
    ]

    # Prune weak edges: "related" type with only 1 article and low effective weight
    pruned_links = []
    weak_edge_count = 0
    for link in retained_links:
        ew = link.get("effective_weight", link.get("weight", 1))
        rt = link.get("relation_type", "related")
        ac = link.get("article_count", 1)
        # Drop: catch-all "related" with single article evidence and low effective weight
        if rt == "related" and ac <= 1 and ew < EDGE_STRENGTH_PRUNE_THRESHOLD:
            weak_edge_count += 1
            continue
        pruned_links.append(link)
    retained_links = pruned_links

    retained_links.sort(key=lambda item: (-item["weight"], item["relation_type"], item["source"], item["target"]))

    # Remove orphan nodes (zero edges after all pruning)
    connected_ids = set()
    for link in retained_links:
        connected_ids.add(link.get("source"))
        connected_ids.add(link.get("target"))
    orphan_count = len(retained_nodes) - len([n for n in retained_nodes if n["id"] in connected_ids])
    retained_nodes = [node for node in retained_nodes if node["id"] in connected_ids]

    return {
        "nodes": retained_nodes,
        "links": retained_links,
        "metadata": {
            **full_graph.get("metadata", {}),
            "source": "canonical-full-derived",
            "layer": "canonical",
            "pruning": {
                "rule": "connected (degree >= 1) after weak-edge removal",
                "weakEdgesPruned": weak_edge_count,
                "removedNodeCount": len(full_nodes) - len(retained_nodes),
                "orphanedNodeCount": orphan_count,
            },
            "baseNodeCount": len(full_nodes),
            "baseLinkCount": len(full_links),
        },
    }


def build_graph_bundle_from_manifest(manifest: dict, allow_partial: bool = False) -> tuple[dict | None, dict | None, dict]:
    ready_ids = ready_article_ids(manifest)
    missing_ids = missing_article_ids(manifest)
    included_ready_ids = [article_id for article_id in ready_ids if article_id not in EXCLUDED_ARTICLES]
    included_missing_ids = [article_id for article_id in missing_ids if article_id not in EXCLUDED_ARTICLES]
    summary = {
        "ready_article_ids": ready_ids,
        "missing_article_ids": missing_ids,
        "ready_count": len(ready_ids),
        "missing_count": len(missing_ids),
        "included_ready_count": len(included_ready_ids),
        "included_missing_count": len(included_missing_ids),
    }
    if missing_ids and not allow_partial:
        return None, None, summary

    artifacts = load_article_artifacts(included_ready_ids)
    full_graph = aggregate_article_artifacts(
        artifacts,
        expected_article_count=len(included_ready_ids) + len(included_missing_ids),
        missing_ids=included_missing_ids,
    )
    canonical_graph = derive_canonical_graph(full_graph)
    return full_graph, canonical_graph, summary


def build_graph_from_manifest(manifest: dict, allow_partial: bool = False) -> tuple[dict | None, dict]:
    _full_graph, canonical_graph, summary = build_graph_bundle_from_manifest(manifest, allow_partial=allow_partial)
    return canonical_graph, summary


def export_graphs(full_graph: dict, canonical_graph: dict) -> None:
    save_json_file(CANONICAL_FULL_GRAPH_FILE, full_graph)
    save_json_file(CANONICAL_GRAPH_FILE, canonical_graph)


def export_graph(graph: dict) -> None:
    save_json_file(CANONICAL_GRAPH_FILE, graph)


def canonical_snapshot_exists() -> bool:
    return CANONICAL_GRAPH_FILE.exists()


def project_relative(path: str) -> str:
    return str((PROJECT_ROOT / path).relative_to(PROJECT_ROOT))
