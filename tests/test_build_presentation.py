"""Tests for build_presentation.py article payload generation."""
from pathlib import Path
from unittest.mock import patch

import pytest

from build_presentation import (
    build_article_index,
    build_article_payloads,
    validate_article_payloads,
    validate_graph_metadata,
)


def _article(article_id: str, title: str = "Title") -> dict:
    return {
        "id": article_id,
        "title": title,
        "date": "2026-01-01",
        "author": "tester",
        "path": f"articles/{article_id}_2026-01-01_tester_{title}.md",
        "text": "Body text for excerpt generation.",
        "raw_text": f"# {title}\n\nBody text for excerpt generation.",
    }


def _graph() -> dict:
    return {
        "nodes": [
            {
                "id": "openclaw",
                "name": "OpenClaw",
                "displayName": "OpenClaw",
                "type": "product",
                "description": "OpenClaw desc",
                "aliases": [],
            },
            {
                "id": "moltbook",
                "name": "Moltbook",
                "displayName": "Moltbook",
                "type": "product",
                "description": "Moltbook desc",
                "aliases": [],
            },
        ],
        "links": [],
        "metadata": {
            "articleCount": 2,
            "includedArticleCount": 2,
            "isPartial": False,
            "missingArticleIds": [],
        },
    }


class TestBuildArticlePayloads:
    def test_keeps_source_articles_even_when_artifact_missing(self):
        source_articles = [_article("001", "One"), _article("003", "Three")]
        artifacts = {
            "001": {
                "entities": [
                    {
                        "id": "openclaw",
                        "name": "OpenClaw",
                        "type": "product",
                        "description": "desc",
                        "mention_count": 2,
                        "aliases": [],
                        "tags": ["agent"],
                    }
                ],
                "relationships": [],
            }
        }

        def fake_load_json(path: Path):
            return artifacts.get(path.stem)

        with patch("build_presentation.load_json", side_effect=fake_load_json):
            payloads, missing = build_article_payloads(source_articles, _graph())

        assert [payload["id"] for payload in payloads] == ["001", "003"]
        assert missing == ["003"]
        third = next(payload for payload in payloads if payload["id"] == "003")
        assert third["entity_count"] == 0
        assert third["relationship_count"] == 0

    def test_resolves_relationships_to_canonical_graph_nodes(self):
        source_articles = [_article("067", "OpenClaw不如狗一条")]
        artifacts = {
            "067": {
                "entities": [
                    {
                        "id": "moltbook",
                        "name": "Moltbook",
                        "type": "product",
                        "description": "desc",
                        "mention_count": 3,
                        "aliases": [],
                        "tags": [],
                    },
                    {
                        "id": "openclaw",
                        "name": "OpenClaw",
                        "type": "product",
                        "description": "desc",
                        "mention_count": 4,
                        "aliases": [],
                        "tags": [],
                    },
                ],
                "relationships": [
                    {
                        "source": "Moltbook",
                        "target": "OpenClaw",
                        "relation_type": "related",
                        "label": "derived",
                        "weight": 1,
                    }
                ],
            }
        }

        def fake_load_json(path: Path):
            return artifacts.get(path.stem)

        with patch("build_presentation.load_json", side_effect=fake_load_json):
            payloads, missing = build_article_payloads(source_articles, _graph())

        assert missing == []
        relationship = payloads[0]["relationships"][0]
        assert relationship["source_id"] == "moltbook"
        assert relationship["target_id"] == "openclaw"
        assert relationship["source"] == "Moltbook"
        assert relationship["target"] == "OpenClaw"


class TestValidation:
    def test_validate_article_payloads_rejects_missing_graph_refs(self):
        payloads = [
            {
                "id": "001",
                "entities": [{"id": "openclaw"}],
                "relationships": [
                    {
                        "source_id": "openclaw",
                        "target_id": "ghost",
                    }
                ],
            }
        ]

        with pytest.raises(ValueError, match="relationship refs missing from graph"):
            validate_article_payloads(payloads, _graph(), expected_article_ids=["001"])

    def test_build_article_index_uses_payloads(self):
        article_index = build_article_index(
            [
                {
                    "id": "001",
                    "title": "One",
                    "date": "2026-01-01",
                    "author": "tester",
                    "path": "articles/001.md",
                    "permalink": "/articles/001",
                    "markdown_link": "articles/001.md",
                    "excerpt": "excerpt",
                    "entity_count": 1,
                    "relationship_count": 0,
                }
            ],
            is_partial=False,
            missing_article_ids=[],
        )
        assert article_index["count"] == 1
        assert article_index["articles"][0]["id"] == "001"

    def test_validate_graph_metadata_checks_counts(self):
        with pytest.raises(ValueError, match="articleCount=1"):
            validate_graph_metadata(
                {
                    "metadata": {
                        "articleCount": 1,
                        "includedArticleCount": 1,
                    }
                },
                expected_article_count=2,
            )
