"""Tests for build_presentation.py article payload generation."""
from pathlib import Path
from unittest.mock import patch

import pytest

from build_presentation import (
    build_article_index,
    build_article_payloads,
    normalize_article_markdown,
    stable_presentation_timestamp,
    validate_article_payloads,
    validate_graph_metadata,
)


def test_stable_presentation_timestamp_uses_latest_ready_extraction():
    manifest = {
        "articles": {
            "001": {"status": "ready", "extracted_at": "2026-07-20T10:00:00Z"},
            "002": {"status": "ready", "extracted_at": "2026-07-28T06:01:50Z"},
            "003": {"status": "removed", "extracted_at": "2026-07-29T00:00:00Z"},
        }
    }

    assert stable_presentation_timestamp(manifest) == "2026-07-28T06:01:50Z"


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
    def test_normalizes_body_markdown_but_keeps_raw_markdown(self):
        source_articles = [
            {
                **_article("001", "Wrapped"),
                "text": (
                    "第一句先被错误断行\n"
                    "继续接在同一句里。\n"
                    "第二句提供更多背景，方便超过阈值。\n"
                    "第三句继续解释为什么这是一坨文本。\n"
                    "第四句仍然没有空行。\n"
                    "第五句让这段足够长。\n"
                    "第六句应当被拆出可读段落。\n"
                    "第七句收尾。"
                ),
                "raw_text": "# Wrapped\n\nraw source should stay untouched",
            }
        ]

        with patch("build_presentation.load_json", return_value={}):
            payloads, missing = build_article_payloads(source_articles, _graph())

        assert missing == ["001"]
        payload = payloads[0]
        assert payload["raw_markdown"] == "# Wrapped\n\nraw source should stay untouched"
        assert "错误断行继续接在同一句里" in payload["body_markdown"]
        assert "\n\n" in payload["body_markdown"]

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


class TestNormalizeArticleMarkdown:
    def test_splits_single_newline_heavy_chinese_text_into_paragraphs(self):
        markdown = "\n".join(
            [
                "亲爱的AI炒作狗们，",
                "别做一句话生成产品了，因为它只会制造噪音。",
                "原因很简单，问题在信息输入。",
                "没有原创输入，AI只是在重复互联网已有信息。",
                "这会让用户读到更多低质量内容。",
                "真正的价值增量在信息输入环节。",
                "创作者才是高质量的信息源。",
                "所以产品首先要解决输入问题。",
            ]
        )

        normalized = normalize_article_markdown(markdown)

        assert "狗们，别做" in normalized
        assert normalized.count("\n\n") >= 1

    def test_preserves_structural_markdown_blocks(self):
        markdown = "\n".join(
            [
                "- 第一项",
                "- 第二项",
                "",
                "![图](https://example.com/a.png)",
                "",
                "```",
                "const x = 1",
                "```",
            ]
        )

        assert normalize_article_markdown(markdown) == markdown

    def test_leaves_healthy_paragraphs_unchanged(self):
        markdown = "第一段已经很好。没有必要重切。\n\n第二段也很好。"

        assert normalize_article_markdown(markdown) == markdown

    def test_keeps_short_opening_quote_as_own_paragraph(self):
        markdown = "\n".join(
            [
                "「香农：噪音是信息的敌人」",
                "亲爱的AI炒作狗们，",
                "别做一句话生成产品了，因为它只会制造噪音。",
                "原因很简单，问题在信息输入。",
                "没有原创输入，AI只是在重复互联网已有信息。",
                "这会让用户读到更多低质量内容。",
                "真正的价值增量在信息输入环节。",
                "创作者才是高质量的信息源。",
            ]
        )

        normalized = normalize_article_markdown(markdown)

        assert normalized.startswith("「香农：噪音是信息的敌人」\n\n亲爱的AI炒作狗们，")


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
