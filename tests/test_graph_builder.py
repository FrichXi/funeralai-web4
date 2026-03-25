"""Tests for graph_builder.py with synthetic data."""
import pytest

from graph_builder import (
    aggregate_article_artifacts,
    derive_canonical_graph,
    normalize_article_extraction,
)


def _make_article(article_id="001", title="Test Article", text="OpenAI and ChatGPT are discussed."):
    return {
        "id": article_id,
        "title": title,
        "path": f"articles/{article_id}_2024-01-01_test_{title}.md",
        "date": "2024-01-01",
        "author": "test",
        "text": text,
        "content_hash": "fake_hash",
    }


def _make_raw_result():
    return {
        "entities": [
            {"name": "OpenAI", "type": "company", "description": "AI company", "aliases": [], "tags": []},
            {"name": "ChatGPT", "type": "product", "description": "AI chatbot", "aliases": [], "tags": []},
        ],
        "relationships": [
            {
                "source": "OpenAI",
                "target": "ChatGPT",
                "type": "develops",
                "description": "OpenAI develops ChatGPT",
                "confidence": "high",
            },
        ],
    }


class TestNormalizeArticleExtraction:
    def test_basic_normalization(self):
        article = _make_article()
        raw = _make_raw_result()
        result = normalize_article_extraction(article, raw)

        assert "article" in result
        assert "entities" in result
        assert "relationships" in result
        assert "metadata" in result
        assert result["article"]["id"] == "001"

    def test_entities_have_required_fields(self):
        article = _make_article()
        raw = _make_raw_result()
        result = normalize_article_extraction(article, raw)

        for entity in result["entities"]:
            assert "id" in entity
            assert "name" in entity
            assert "type" in entity
            assert entity["type"] in ("company", "person", "product", "vc_firm")

    def test_relationships_normalized(self):
        article = _make_article()
        raw = _make_raw_result()
        result = normalize_article_extraction(article, raw)

        for rel in result["relationships"]:
            assert "source" in rel
            assert "target" in rel
            assert "relation_type" in rel

    def test_empty_input(self):
        article = _make_article(text="No entities here.")
        raw = {"entities": [], "relationships": []}
        result = normalize_article_extraction(article, raw)
        assert result["entities"] == []
        assert result["relationships"] == []


class TestAggregateArticleArtifacts:
    def test_single_artifact(self):
        artifact = {
            "article": {"id": "001", "title": "Test", "date": "2024-01-01", "path": "articles/001.md"},
            "entities": [
                {"id": "openai", "name": "OpenAI", "type": "company",
                 "description": "AI company", "mention_count": 5,
                 "aliases": [], "tags": []},
            ],
            "relationships": [],
        }
        result = aggregate_article_artifacts([artifact])
        assert len(result["nodes"]) == 1
        assert result["nodes"][0]["name"] == "OpenAI"
        assert result["nodes"][0]["mention_count"] == 5

    def test_merge_across_articles(self):
        a1 = {
            "article": {"id": "001", "title": "T1", "date": "2024-01-01", "path": "p1"},
            "entities": [
                {"id": "openai", "name": "OpenAI", "type": "company",
                 "description": "AI company", "mention_count": 3,
                 "aliases": [], "tags": []},
            ],
            "relationships": [],
        }
        a2 = {
            "article": {"id": "002", "title": "T2", "date": "2024-01-02", "path": "p2"},
            "entities": [
                {"id": "openai", "name": "OpenAI", "type": "company",
                 "description": "AI research lab", "mention_count": 7,
                 "aliases": [], "tags": []},
            ],
            "relationships": [],
        }
        result = aggregate_article_artifacts([a1, a2])
        assert len(result["nodes"]) == 1
        assert result["nodes"][0]["mention_count"] == 10
        assert result["nodes"][0]["article_count"] == 2


class TestDeriveCanonicalGraph:
    def test_removes_orphan_nodes(self):
        full = {
            "nodes": [
                {"id": "a", "name": "A", "mention_count": 5, "article_count": 2},
                {"id": "b", "name": "B", "mention_count": 5, "article_count": 2},
                {"id": "orphan", "name": "Orphan", "mention_count": 3, "article_count": 1},
            ],
            "links": [
                {"source": "a", "target": "b", "relation_type": "competes_with",
                 "weight": 2, "effective_weight": 8, "article_count": 2},
            ],
            "metadata": {},
        }
        canonical = derive_canonical_graph(full)
        node_ids = {n["id"] for n in canonical["nodes"]}
        assert "orphan" not in node_ids
        assert "a" in node_ids
        assert "b" in node_ids

    def test_prunes_weak_related_edges(self):
        full = {
            "nodes": [
                {"id": "a", "name": "A", "mention_count": 5, "article_count": 2},
                {"id": "b", "name": "B", "mention_count": 5, "article_count": 2},
            ],
            "links": [
                {"source": "a", "target": "b", "relation_type": "related",
                 "weight": 1, "effective_weight": 1, "article_count": 1},
            ],
            "metadata": {},
        }
        canonical = derive_canonical_graph(full)
        assert len(canonical["links"]) == 0

    def test_keeps_strong_edges(self):
        full = {
            "nodes": [
                {"id": "a", "name": "A", "mention_count": 5, "article_count": 2},
                {"id": "b", "name": "B", "mention_count": 5, "article_count": 2},
            ],
            "links": [
                {"source": "a", "target": "b", "relation_type": "founder_of",
                 "weight": 3, "effective_weight": 15, "article_count": 3},
            ],
            "metadata": {},
        }
        canonical = derive_canonical_graph(full)
        assert len(canonical["links"]) == 1
