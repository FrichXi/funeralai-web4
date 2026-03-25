"""Tests for pipeline_state.py functions."""
import warnings
from pathlib import Path
from unittest.mock import patch

import pytest

from pipeline_state import (
    ARTICLE_FILENAME_RE,
    article_record_from_path,
    extract_article_body,
    extraction_decision,
    load_articles,
    sha256_text,
)


class TestArticleFilenameRegex:
    def test_valid_format(self):
        assert ARTICLE_FILENAME_RE.match("001_2023-01-15_zanai_AI行业评论.md")

    def test_valid_with_underscores_in_title(self):
        assert ARTICLE_FILENAME_RE.match("068_2026-03-10_author_Some_Title_Here.md")

    def test_missing_date(self):
        assert ARTICLE_FILENAME_RE.match("001_zanai_title.md") is None

    def test_wrong_date_format(self):
        assert ARTICLE_FILENAME_RE.match("001_2023-1-15_zanai_title.md") is None

    def test_missing_author(self):
        assert ARTICLE_FILENAME_RE.match("001_2023-01-15_.md") is None


class TestExtractArticleBody:
    def test_with_frontmatter(self):
        raw = "---\ntitle: Test\n---\nBody content\n---\n"
        # The function extracts between first and last ---
        body = extract_article_body(raw)
        assert "Body content" in body

    def test_without_frontmatter(self):
        raw = "Just plain text\nNo frontmatter"
        body = extract_article_body(raw)
        assert "Just plain text" in body

    def test_drops_credit_lines(self):
        raw = "---\ntitle: Test\n---\nGood content\n本文配图由Midjourney生成\n---\n"
        body = extract_article_body(raw)
        assert "配图" not in body

    def test_strips_leading_trailing_blank_lines(self):
        # Function extracts between first and last ---
        raw = "---\n\n\nContent\n\n\n---\n"
        body = extract_article_body(raw)
        assert body == "Content"

    def test_collapses_triple_newlines(self):
        raw = "---\n---\nA\n\n\n\nB\n---\n"
        body = extract_article_body(raw)
        assert "\n\n\n" not in body


class TestExtractionDecision:
    def test_new_article(self):
        article = {"id": "001", "content_hash": "abc123"}
        should, reason = extraction_decision(article, None)
        assert should is True
        assert reason == "new_article"

    def test_up_to_date(self, tmp_path):
        article = {"id": "001", "content_hash": "abc123"}
        entry = {
            "status": "ready",
            "content_hash": "abc123",
            "extractor": {
                "model": "gemini-3.1-pro-preview",
                "prompt_version": "2026-03-15-vc-firm-relationship-v7",
                "extractor_version": "2026-03-15-overrides-pipeline-v5",
            },
        }
        # Create a fake artifact file so the existence check passes
        fake_artifact = tmp_path / "001.json"
        fake_artifact.write_text("{}")
        with patch("pipeline_state.extracted_artifact_path", return_value=fake_artifact):
            should, reason = extraction_decision(article, entry)
        assert should is False
        assert reason == "up_to_date"

    def test_content_changed(self):
        article = {"id": "001", "content_hash": "new_hash"}
        entry = {"status": "ready", "content_hash": "old_hash", "extractor": {}}
        should, reason = extraction_decision(article, entry)
        assert should is True
        assert reason == "content_changed"

    def test_forced(self):
        article = {"id": "001", "content_hash": "abc123"}
        entry = {"status": "ready", "content_hash": "abc123", "extractor": {}}
        should, reason = extraction_decision(article, entry, force=True)
        assert should is True
        assert reason == "forced"

    def test_removed_article(self):
        article = {"id": "001", "content_hash": "abc123"}
        entry = {"status": "removed", "content_hash": "abc123", "extractor": {}}
        should, reason = extraction_decision(article, entry)
        assert should is False
        assert reason == "removed"


class TestSha256Text:
    def test_deterministic(self):
        assert sha256_text("hello") == sha256_text("hello")

    def test_different_inputs(self):
        assert sha256_text("a") != sha256_text("b")


class TestLoadArticles:
    def test_rejects_duplicate_article_ids(self, tmp_path):
        first = tmp_path / "001_2025-01-01_author_first.md"
        second = tmp_path / "001_2025-01-02_author_second.md"
        first.write_text("first", encoding="utf-8")
        second.write_text("second", encoding="utf-8")

        with patch("pipeline_state.ARTICLE_SOURCE_DIR", tmp_path), patch("pipeline_state.ARTICLES_DIR", tmp_path):
            with pytest.raises(ValueError, match="Duplicate article IDs"):
                load_articles()
