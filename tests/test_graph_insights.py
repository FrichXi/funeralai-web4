"""Tests for graph insight and shell payload generation."""

import gzip
import json

from graph_insights import build_graph_insights, build_graph_shell


def _node(node_id: str, name: str, node_type: str, articles: list[str], degree: int = 1):
    return {
        "id": node_id,
        "name": name,
        "displayName": name,
        "type": node_type,
        "description": f"{name} desc",
        "mention_count": 5,
        "article_count": len(articles),
        "aliases": [],
        "tags": [],
        "references": len(articles),
        "source_article_count": len(articles),
        "source_articles": [
            {
                "article_id": article_id,
                "title": f"Article {article_id}",
                "permalink": f"/articles/{article_id}",
                "mention_count": 1,
            }
            for article_id in articles
        ],
        "degree": degree,
        "composite_weight": 0.5,
    }


def _link(source: str, target: str, relation_type: str = "related"):
    return {
        "source": source,
        "target": target,
        "relation_type": relation_type,
        "type": relation_type,
        "label": relation_type,
        "weight": 1,
        "strength": 1,
        "effective_weight": 1,
        "article_count": 1,
        "evidence_articles": ["001"],
        "evidences": [],
    }


def _graph():
    return {
        "nodes": [
            _node("a", "A", "product", ["001", "002"], degree=2),
            _node("b", "B", "product", ["001"], degree=2),
            _node("c", "C", "product", ["001", "003"], degree=2),
            _node("d", "D", "company", ["004"], degree=1),
            _node("e", "E", "company", ["004"], degree=1),
            _node("f", "F", "person", ["002", "004"], degree=2),
        ],
        "links": [
            _link("a", "b", "compares_to"),
            _link("b", "c", "compares_to"),
            _link("a", "f", "works_on"),
            _link("d", "e", "competes_with"),
            _link("e", "f", "works_at"),
        ],
        "metadata": {
            "articleCount": 4,
            "includedArticleCount": 4,
            "missingArticleIds": [],
            "isPartial": False,
        },
    }


def test_suggested_edges_do_not_duplicate_fact_edges():
    graph = _graph()
    insights = build_graph_insights(graph)
    fact_pairs = {tuple(sorted((link["source"], link["target"]))) for link in graph["links"]}

    assert insights["suggested_edges"]
    for suggestion in insights["suggested_edges"]:
        pair = tuple(sorted((suggestion["source"], suggestion["target"])))
        assert pair not in fact_pairs
        assert suggestion["status"] == "suggested"
        assert suggestion["score"] > 0


def test_community_and_layout_are_stable():
    graph = _graph()
    insights_a = build_graph_insights(graph)
    insights_b = build_graph_insights(graph)
    shell_a = build_graph_shell(graph, insights_a)
    shell_b = build_graph_shell(graph, insights_b)

    assert insights_a["node_communities"] == insights_b["node_communities"]
    assert [node["community_id"] for node in shell_a["nodes"]] == [
        node["community_id"] for node in shell_b["nodes"]
    ]
    assert [(node["x"], node["y"]) for node in shell_a["nodes"]] == [
        (node["x"], node["y"]) for node in shell_b["nodes"]
    ]


def test_layout_is_independent_of_graph_insertion_order():
    graph = _graph()
    insights = build_graph_insights(graph)
    reversed_graph = {
        **graph,
        "nodes": list(reversed(graph["nodes"])),
        "links": list(reversed(graph["links"])),
    }

    normal = build_graph_shell(graph, insights)
    reversed_shell = build_graph_shell(reversed_graph, insights)
    normal_positions = {node["id"]: (node["x"], node["y"]) for node in normal["nodes"]}
    reversed_positions = {node["id"]: (node["x"], node["y"]) for node in reversed_shell["nodes"]}

    assert reversed_positions == normal_positions


def test_shell_payload_stays_lightweight():
    shell = build_graph_shell(_graph(), build_graph_insights(_graph()))
    raw = json.dumps(shell, ensure_ascii=False).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=9)

    assert b"source_articles" not in raw
    assert b"evidences" not in raw
    assert len(raw) < 500_000
    assert len(compressed) < 120_000
    assert shell["nodes"][0]["description"] == "A desc"
    assert shell["nodes"][0]["displayName"] == "A"
