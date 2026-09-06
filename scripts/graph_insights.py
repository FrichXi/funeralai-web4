#!/usr/bin/env python3
"""Generate graph insight payloads for the static frontend.

This module keeps inferred structure separate from the canonical fact graph:
communities, bridge nodes, suggested edges, shell graph data, and entity detail
payloads are presentation artifacts only.
"""

from __future__ import annotations

import itertools
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import networkx as nx

SEED = 42
MAX_SUGGESTED_EDGES = 250
MAX_SUGGESTED_EDGES_PER_NODE = 5
COMMUNITY_COLORS = [
    "#7351cf",
    "#14c8a8",
    "#f59e0b",
    "#ef476f",
    "#4cc9f0",
    "#a855f7",
    "#22c55e",
    "#f97316",
    "#06b6d4",
    "#e879f9",
]


def _node_label(node: dict[str, Any]) -> str:
    return str(node.get("displayName") or node.get("name") or node["id"])


def _edge_pair(source: str, target: str) -> tuple[str, str]:
    return tuple(sorted((source, target)))


def _build_networkx_graph(graph_view: dict[str, Any]) -> nx.Graph:
    graph = nx.Graph()
    for node in graph_view.get("nodes", []):
        graph.add_node(node["id"], **node)
    for link in graph_view.get("links", []):
        source = link["source"]
        target = link["target"]
        if source == target:
            continue
        weight = float(link.get("effective_weight") or link.get("weight") or 1)
        if graph.has_edge(source, target):
            graph[source][target]["weight"] += weight
        else:
            graph.add_edge(source, target, weight=weight)
    return graph


def _detect_communities(graph: nx.Graph) -> dict[str, str]:
    """Return node_id -> stable community_id.

    Leiden is preferred when python-igraph/leidenalg are installed. NetworkX
    Louvain is the fallback so local builds remain resilient.
    """
    node_ids = list(graph.nodes())
    if not node_ids:
        return {}

    raw_communities: list[list[str]]
    try:
        import igraph as ig  # type: ignore
        import leidenalg as la  # type: ignore

        index = {node_id: i for i, node_id in enumerate(node_ids)}
        edges = [(index[u], index[v]) for u, v in graph.edges()]
        weights = [float(graph[u][v].get("weight", 1.0)) for u, v in graph.edges()]
        ig_graph = ig.Graph(n=len(node_ids), edges=edges, directed=False)
        partition = la.find_partition(
            ig_graph,
            la.ModularityVertexPartition,
            weights=weights if weights else None,
            seed=SEED,
        )
        raw_communities = [[node_ids[i] for i in community] for community in partition]
    except Exception:
        raw_communities = [
            sorted(community)
            for community in nx.community.louvain_communities(
                graph,
                weight="weight",
                seed=SEED,
            )
        ]

    def community_rank(nodes: list[str]) -> tuple[float, int, str]:
        top_weight = max(
            float(graph.nodes[node].get("composite_weight") or 0)
            for node in nodes
        )
        return (-top_weight, -len(nodes), min(nodes))

    sorted_communities = sorted(raw_communities, key=community_rank)
    mapping: dict[str, str] = {}
    for index, community in enumerate(sorted_communities, start=1):
        community_id = f"c{index:02d}"
        for node_id in community:
            mapping[node_id] = community_id
    return mapping


def _summarize_communities(
    graph_view: dict[str, Any],
    community_by_node: dict[str, str],
) -> list[dict[str, Any]]:
    nodes_by_id = {node["id"]: node for node in graph_view.get("nodes", [])}
    grouped: dict[str, list[str]] = defaultdict(list)
    for node_id, community_id in community_by_node.items():
        grouped[community_id].append(node_id)

    internal_edges: Counter[str] = Counter()
    for link in graph_view.get("links", []):
        source_community = community_by_node.get(link["source"])
        target_community = community_by_node.get(link["target"])
        if source_community and source_community == target_community:
            internal_edges[source_community] += 1

    summaries: list[dict[str, Any]] = []
    for community_id in sorted(grouped):
        node_ids = grouped[community_id]
        top_nodes = sorted(
            (nodes_by_id[node_id] for node_id in node_ids),
            key=lambda node: (
                -float(node.get("composite_weight") or 0),
                -int(node.get("degree") or 0),
                _node_label(node),
            ),
        )[:5]
        top_names = [_node_label(node) for node in top_nodes]
        summaries.append({
            "id": community_id,
            "name": " / ".join(top_names[:3]) + " 圈",
            "node_count": len(node_ids),
            "link_count": internal_edges[community_id],
            "top_nodes": [
                {
                    "id": node["id"],
                    "name": _node_label(node),
                    "type": node.get("type", "product"),
                    "degree": node.get("degree", 0),
                    "composite_weight": node.get("composite_weight", 0),
                }
                for node in top_nodes
            ],
            "color": COMMUNITY_COLORS[(int(community_id[1:]) - 1) % len(COMMUNITY_COLORS)],
        })

    return sorted(summaries, key=lambda item: (-item["node_count"], item["id"]))


def _article_index_by_node(graph_view: dict[str, Any]) -> dict[str, set[str]]:
    result: dict[str, set[str]] = {}
    for node in graph_view.get("nodes", []):
        article_ids = {
            str(article.get("article_id"))
            for article in node.get("source_articles", [])
            if isinstance(article, dict) and article.get("article_id")
        }
        result[node["id"]] = article_ids
    return result


def _candidate_pairs(
    graph: nx.Graph,
    article_ids_by_node: dict[str, set[str]],
) -> set[tuple[str, str]]:
    candidates: set[tuple[str, str]] = set()
    article_to_nodes: dict[str, list[str]] = defaultdict(list)
    for node_id, article_ids in article_ids_by_node.items():
        for article_id in article_ids:
            article_to_nodes[article_id].append(node_id)

    for node_ids in article_to_nodes.values():
        if len(node_ids) > 40:
            node_ids = sorted(
                node_ids,
                key=lambda node_id: -int(graph.nodes[node_id].get("mention_count") or 0),
            )[:40]
        for source, target in itertools.combinations(sorted(node_ids), 2):
            if not graph.has_edge(source, target):
                candidates.add((source, target))

    for node_id in graph.nodes():
        two_hop: set[str] = set()
        for neighbor in graph.neighbors(node_id):
            two_hop.update(graph.neighbors(neighbor))
        for other_id in two_hop:
            if other_id != node_id and not graph.has_edge(node_id, other_id):
                candidates.add(_edge_pair(node_id, other_id))

    return candidates


def _relation_guess(source: dict[str, Any], target: dict[str, Any]) -> str:
    source_type = source.get("type")
    target_type = target.get("type")
    if source_type == target_type and source_type in {"product", "company"}:
        return "compares_to"
    return "related"


def _suggest_edges(
    graph_view: dict[str, Any],
    graph: nx.Graph,
    community_by_node: dict[str, str],
) -> list[dict[str, Any]]:
    article_ids_by_node = _article_index_by_node(graph_view)
    candidates = sorted(_candidate_pairs(graph, article_ids_by_node))
    if not candidates:
        return []

    aa_scores = {
        _edge_pair(source, target): score
        for source, target, score in nx.adamic_adar_index(graph, candidates)
    }
    ra_scores = {
        _edge_pair(source, target): score
        for source, target, score in nx.resource_allocation_index(graph, candidates)
    }
    max_aa = max(aa_scores.values() or [1.0]) or 1.0
    max_ra = max(ra_scores.values() or [1.0]) or 1.0

    suggestions: list[dict[str, Any]] = []
    for source, target in candidates:
        pair = _edge_pair(source, target)
        common_articles = sorted(article_ids_by_node[source] & article_ids_by_node[target])
        common_neighbors = len(list(nx.common_neighbors(graph, source, target)))
        if not common_articles and common_neighbors == 0:
            continue

        same_community = community_by_node.get(source) == community_by_node.get(target)
        source_node = graph.nodes[source]
        target_node = graph.nodes[target]
        same_type = source_node.get("type") == target_node.get("type")
        score = (
            0.35 * min(len(common_articles) / 5, 1)
            + 0.25 * min(common_neighbors / 6, 1)
            + 0.20 * (aa_scores.get(pair, 0.0) / max_aa)
            + 0.12 * (ra_scores.get(pair, 0.0) / max_ra)
            + (0.05 if same_community else 0)
            + (0.03 if same_type else 0)
        )
        if score < 0.18:
            continue

        reasons = []
        if common_articles:
            reasons.append(f"共同出现于 {len(common_articles)} 篇文章")
        if common_neighbors:
            reasons.append(f"共享 {common_neighbors} 个邻居")
        if same_community:
            reasons.append("处于同一讨论社区")

        suggestions.append({
            "source": source,
            "target": target,
            "score": round(score, 4),
            "suggested_relation_type": _relation_guess(source_node, target_node),
            "reason": "；".join(reasons),
            "evidence_article_ids": common_articles[:5],
            "status": "suggested",
        })

    suggestions.sort(key=lambda item: (-item["score"], item["source"], item["target"]))
    return suggestions[:MAX_SUGGESTED_EDGES]


def _bridge_nodes(
    graph_view: dict[str, Any],
    graph: nx.Graph,
    community_by_node: dict[str, str],
) -> list[dict[str, Any]]:
    if graph.number_of_nodes() == 0:
        return []

    centrality = nx.betweenness_centrality(graph, weight=None, normalized=True)
    max_centrality = max(centrality.values() or [1.0]) or 1.0
    nodes_by_id = {node["id"]: node for node in graph_view.get("nodes", [])}
    bridges: list[dict[str, Any]] = []

    for node_id in graph.nodes():
        neighbor_communities = {
            community_by_node.get(neighbor)
            for neighbor in graph.neighbors(node_id)
            if community_by_node.get(neighbor) and community_by_node.get(neighbor) != community_by_node.get(node_id)
        }
        cross_count = len(neighbor_communities)
        if cross_count == 0 and centrality.get(node_id, 0) < 0.005:
            continue
        node = nodes_by_id[node_id]
        score = 0.65 * (centrality.get(node_id, 0) / max_centrality) + 0.35 * min(cross_count / 4, 1)
        bridges.append({
            "node_id": node_id,
            "name": _node_label(node),
            "type": node.get("type", "product"),
            "community_id": community_by_node.get(node_id),
            "cross_community_count": cross_count,
            "betweenness": round(centrality.get(node_id, 0), 6),
            "score": round(score, 4),
        })

    bridges.sort(key=lambda item: (-item["score"], item["name"]))
    return bridges[:40]


def _layout_positions(
    graph: nx.Graph,
    communities: list[dict[str, Any]],
    community_by_node: dict[str, str],
) -> dict[str, dict[str, float]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for node_id, community_id in community_by_node.items():
        grouped[community_id].append(node_id)
    for node_ids in grouped.values():
        node_ids.sort()

    community_graph = nx.Graph()
    for community in sorted(communities, key=lambda item: item["id"]):
        community_graph.add_node(community["id"])
    community_edge_weights: dict[tuple[str, str], int] = defaultdict(int)
    for source, target in graph.edges():
        source_community = community_by_node.get(source)
        target_community = community_by_node.get(target)
        if source_community and target_community and source_community != target_community:
            edge = tuple(sorted((source_community, target_community)))
            community_edge_weights[edge] += 1
    for (source_community, target_community), weight in sorted(community_edge_weights.items()):
        community_graph.add_edge(source_community, target_community, weight=weight)

    if community_graph.number_of_nodes() <= 1:
        community_positions = {node: (0.0, 0.0) for node in community_graph.nodes()}
    else:
        community_positions = nx.spring_layout(
            community_graph,
            seed=SEED,
            weight="weight",
            scale=1200,
            iterations=120,
        )

    positions: dict[str, dict[str, float]] = {}
    for index, community in enumerate(communities):
        community_id = community["id"]
        node_ids = grouped[community_id]
        center_x, center_y = community_positions.get(community_id, (0.0, 0.0))
        radius = max(90.0, math.sqrt(len(node_ids)) * 42.0)
        subgraph = nx.Graph()
        subgraph.add_nodes_from(node_ids)
        local_edges = []
        for source, target, edge_data in graph.subgraph(node_ids).edges(data=True):
            ordered_source, ordered_target = sorted((source, target))
            local_edges.append((ordered_source, ordered_target, dict(edge_data)))
        subgraph.add_edges_from(sorted(local_edges, key=lambda edge: (edge[0], edge[1])))
        if len(node_ids) == 1:
            local_positions = {node_ids[0]: (0.0, 0.0)}
        else:
            local_positions = nx.spring_layout(
                subgraph,
                seed=SEED + index + 1,
                weight="weight",
                scale=radius,
                iterations=90,
            )
        for node_id, (x, y) in local_positions.items():
            positions[node_id] = {
                "x": round(float(center_x + x), 3),
                "y": round(float(center_y + y), 3),
            }

    # Pack disconnected components around the main network. Otherwise tiny
    # peripheral components consume the viewport and compress the main graph.
    components = sorted(nx.connected_components(graph), key=lambda ids: (-len(ids), min(ids)))
    radii = [max(60.0, math.sqrt(len(ids)) * 75.0) for ids in components]
    if not components:
        return positions
    ring = max(radii[0] + 2 * max(radii[1:], default=0) + 100,
               sum(2 * radius + 80 for radius in radii[1:]) / (2 * math.pi))
    angle = 0.0
    for index, (node_ids, radius) in enumerate(zip(components, radii)):
        xs = [positions[node_id]["x"] for node_id in node_ids]
        ys = [positions[node_id]["y"] for node_id in node_ids]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        extent = max(math.hypot(positions[node_id]["x"] - cx, positions[node_id]["y"] - cy)
                     for node_id in node_ids)
        scale = radius / extent if extent else 1.0
        offset_x, offset_y = (0.0, 0.0) if index == 0 else (ring * math.cos(angle), ring * math.sin(angle))
        for node_id in node_ids:
            pos = positions[node_id]
            positions[node_id] = {
                "x": round((pos["x"] - cx) * scale + offset_x, 3),
                "y": round((pos["y"] - cy) * scale + offset_y, 3),
            }
        if index:
            angle += (radius + (radii[index + 1] if index + 1 < len(radii) else radius) + 80) / ring
    return positions


def build_graph_insights(graph_view: dict[str, Any]) -> dict[str, Any]:
    graph = _build_networkx_graph(graph_view)
    community_by_node = _detect_communities(graph)
    communities = _summarize_communities(graph_view, community_by_node)
    suggested_edges = _suggest_edges(graph_view, graph, community_by_node)
    bridge_nodes = _bridge_nodes(graph_view, graph, community_by_node)

    return {
        "version": 1,
        "algorithm": {
            "community": "leidenalg-if-available/networkx-louvain-fallback",
            "link_prediction": "networkx-adamic-adar-resource-allocation-coarticle",
            "layout": "networkx-community-spring-layout",
            "seed": SEED,
        },
        "communities": communities,
        "node_communities": community_by_node,
        "suggested_edges": suggested_edges,
        "bridge_nodes": bridge_nodes,
    }


def build_graph_shell(
    graph_view: dict[str, Any],
    insights: dict[str, Any],
) -> dict[str, Any]:
    graph = _build_networkx_graph(graph_view)
    communities = insights.get("communities", [])
    community_by_node = insights.get("node_communities", {})
    community_lookup = {community["id"]: community for community in communities}
    positions = _layout_positions(graph, communities, community_by_node)

    nodes = []
    for node in graph_view.get("nodes", []):
        community_id = community_by_node.get(node["id"])
        community = community_lookup.get(community_id or "")
        position = positions.get(node["id"], {"x": 0.0, "y": 0.0})
        nodes.append({
            "id": node["id"],
            "name": node.get("name", node["id"]),
            "type": node.get("type", "product"),
            **{key: node[key] for key in ("displayName", "description", "featured") if node.get(key)},
            "mention_count": node.get("mention_count", 0),
            "article_count": node.get("article_count", 0),
            "aliases": node.get("aliases", []),
            "degree": node.get("degree", 0),
            "composite_weight": node.get("composite_weight", 0),
            "community_id": community_id,
            "community_name": community.get("name") if community else "",
            "community_color": community.get("color") if community else COMMUNITY_COLORS[0],
            "x": position["x"],
            "y": position["y"],
        })

    links = []
    for link in graph_view.get("links", []):
        links.append({
            "source": link["source"],
            "target": link["target"],
            "relation_type": link.get("relation_type", link.get("type", "related")),
            "weight": link.get("weight", 1),
        })

    metadata = dict(graph_view.get("metadata", {}))
    metadata["source"] = "graph-shell"
    metadata["layout"] = "preset-v2"
    metadata["insightsVersion"] = insights.get("version", 1)
    metadata["communities"] = communities

    return {
        "nodes": nodes,
        "links": links,
        "metadata": metadata,
    }


def sync_entity_details(
    detail_dir: Path,
    graph_view: dict[str, Any],
    insights: dict[str, Any],
) -> None:
    detail_dir.mkdir(parents=True, exist_ok=True)
    expected = {f"{node['id']}.json" for node in graph_view.get("nodes", [])}
    for existing in detail_dir.glob("*.json"):
        if existing.name not in expected:
            existing.unlink()

    links_by_node: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for link in graph_view.get("links", []):
        links_by_node[link["source"]].append(link)
        links_by_node[link["target"]].append(link)

    suggestions_by_node: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for suggestion in insights.get("suggested_edges", []):
        suggestions_by_node[suggestion["source"]].append(suggestion)
        suggestions_by_node[suggestion["target"]].append(suggestion)

    for node in graph_view.get("nodes", []):
        node_id = node["id"]
        suggestions = sorted(
            suggestions_by_node.get(node_id, []),
            key=lambda item: (-float(item.get("score", 0)), item["source"], item["target"]),
        )[:MAX_SUGGESTED_EDGES_PER_NODE]
        payload = {
            "node": node,
            "links": sorted(
                links_by_node.get(node_id, []),
                key=lambda item: (
                    item.get("relation_type", ""),
                    item.get("source", ""),
                    item.get("target", ""),
                ),
            ),
            "suggested_edges": suggestions,
        }
        with open(detail_dir / f"{node_id}.json", "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
