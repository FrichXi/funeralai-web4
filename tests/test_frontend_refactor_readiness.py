"""Tests for the frontend refactor readiness audit helpers."""

from frontend_refactor_readiness import (
    ArticleParagraphMetrics,
    benchmark_failures,
    classify_status_path,
    grouped_git_status,
    live_content_failures,
)


def test_classify_status_path_keeps_content_data_separate_from_frontend():
    assert classify_status_path("articles/111.md") == "content/data"
    assert classify_status_path("web-data/article-index.json") == "content/data"
    assert classify_status_path("site/public/llms.txt") == "content/data"
    assert classify_status_path("site/src/components/article/ArticleBody.tsx") == "frontend"
    assert classify_status_path("site/scripts/stage-test-sites.mjs") == "frontend"
    assert classify_status_path("docs/frontend-layout-contracts.md") == "docs/contracts"
    assert classify_status_path("scripts/frontend_refactor_readiness.py") == "docs/contracts"
    assert classify_status_path("tests/test_frontend_refactor_readiness.py") == "docs/contracts"


def test_grouped_git_status_uses_porcelain_paths():
    groups = grouped_git_status(
        [
            " M web-data/article-index.json",
            " M site/src/app/globals.css",
            "?? docs/frontend-refactor-checkpoint.md",
        ]
    )

    assert groups["content/data"] == [" M web-data/article-index.json"]
    assert groups["frontend"] == [" M site/src/app/globals.css"]
    assert groups["docs/contracts"] == ["?? docs/frontend-refactor-checkpoint.md"]


def test_article_paragraph_metrics_flags_single_newline_heavy_bodies():
    risky = ArticleParagraphMetrics(
        article_id="001",
        title="Risky",
        body_len=2000,
        paragraph_breaks=2,
        single_newlines=68,
    )
    healthy = ArticleParagraphMetrics(
        article_id="002",
        title="Healthy",
        body_len=2000,
        paragraph_breaks=40,
        single_newlines=80,
    )

    assert risky.has_paragraph_risk
    assert risky.newline_pressure == 34
    assert not healthy.has_paragraph_risk


def test_benchmark_failures_require_manifest_shape():
    assert benchmark_failures({"present": False}) == ["missing staged /test manifest"]
    assert benchmark_failures(
        {
            "present": True,
            "expected_entries": 80,
            "actual_entries": 79,
            "score_standard": "standard",
            "data_version": "version",
            "snapshot_date": "2026-06-15",
        }
    ) == ["benchmark entries mismatch: 79/80"]
    assert (
        benchmark_failures(
            {
                "present": True,
                "expected_entries": 80,
                "actual_entries": 80,
                "score_standard": "standard",
                "data_version": "version",
                "snapshot_date": "2026-06-15",
            }
        )
        == []
    )


def test_live_content_failures_compare_local_and_cloud_article_counts():
    assert live_content_failures({"article_count": 111}, {"ok": False, "error": "timeout"}) == [
        "could not fetch live site metadata: timeout"
    ]
    assert live_content_failures({"article_count": 111}, {"ok": True, "article_count": 108}) == [
        "live article count differs from local web-data: live=108 local=111"
    ]
    assert live_content_failures({"article_count": 111}, {"ok": True, "article_count": 111}) == []
