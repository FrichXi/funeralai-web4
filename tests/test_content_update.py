"""Regression coverage for the failure paths that repeatedly stopped publishing."""
import asyncio
import json
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

import httpx
import pytest

import extract_gemini as extractor
import import_substack_articles as importer
from graph_builder import normalize_article_extraction, build_graph_bundle_from_manifest
from run_pipeline import publication_needed
import run_pipeline


def response_payload():
    return {"choices": [{"finish_reason": "stop", "message": {
        "content": json.dumps({"entities": [], "relationships": []})}}]}


@pytest.mark.parametrize("failure", [400, 401, 403, 429, 503, "timeout", "invalid_json", "truncated"])
def test_provider_failover(failure, monkeypatch):
    providers = [extractor.Provider(name, name + "-model", "https://" + name, "test-key")
                 for name in ("dashscope", "glm", "kimi", "minimax")]
    monkeypatch.setattr(extractor, "configured_providers", lambda: providers)
    extractor._unavailable_providers.clear()
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if request.url.host == "dashscope":
            if failure == "timeout":
                raise httpx.ReadTimeout("timed out", request=request)
            if failure in ("invalid_json", "truncated"):
                payload = response_payload()
                if failure == "truncated":
                    payload["choices"][0]["finish_reason"] = "length"
                else:
                    payload["choices"][0]["message"]["content"] = "not JSON"
                return httpx.Response(200, json=payload)
            return httpx.Response(failure, json={"error": {"type": "Arrearage"}})
        return httpx.Response(200, json=response_payload())

    client_type = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client_type(transport=httpx.MockTransport(handler)))
    parsed, raw, provider = asyncio.run(extractor.call_model("extract", max_retries=1))
    assert calls == ["dashscope", "glm"]
    assert provider.name == "glm" and provider.model == "glm-model"
    assert parsed == {"entities": [], "relationships": []}
    assert "test-key" not in repr(provider)


def test_failover_reaches_kimi_then_minimax_and_reports_total_failure(monkeypatch):
    providers = [extractor.Provider(n, n, "https://" + n, "test-key") for n in ("dashscope", "glm", "kimi", "minimax")]
    monkeypatch.setattr(extractor, "configured_providers", lambda: providers)
    extractor._unavailable_providers.clear()
    calls = []
    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(403, json={"error": {"code": "unavailable"}})
    client_type = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client_type(transport=httpx.MockTransport(handler)))
    with pytest.raises(RuntimeError, match="All configured extraction providers failed"):
        asyncio.run(extractor.call_model("extract", max_retries=1))
    assert calls == ["dashscope", "glm", "kimi", "minimax"]


def test_failed_provider_is_skipped_for_later_articles(monkeypatch):
    providers = [extractor.Provider(n, n, "https://" + n, "test-key") for n in ("dashscope", "glm")]
    monkeypatch.setattr(extractor, "configured_providers", lambda: providers)
    extractor._unavailable_providers.clear()
    calls = []
    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(401, json={"error": {}}) if request.url.host == "dashscope" else httpx.Response(200, json=response_payload())
    client_type = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client_type(transport=httpx.MockTransport(handler)))
    asyncio.run(extractor.call_model("one", max_retries=1))
    asyncio.run(extractor.call_model("two", max_retries=1))
    assert calls == ["dashscope", "glm", "glm"]


def test_substack_read_timeout_retries_then_uses_ego(monkeypatch):
    monkeypatch.setattr(importer.urllib.request, "urlopen", lambda *a, **k: (_ for _ in ()).throw(TimeoutError()))
    monkeypatch.setattr(importer.time, "sleep", lambda _: None)
    monkeypatch.setattr(importer, "ego_script", lambda _: 'EGO_TASK:123\nEGO_BODY:"[]"\n')
    monkeypatch.setattr(importer, "_ego_task_id", None)
    assert importer.fetch_text("https://funeralai.substack.com/feed") == "[]"
    assert importer._ego_task_id == 123


def test_substack_not_found_is_not_retried_in_browser(monkeypatch):
    def missing(*a, **k):
        raise HTTPError("https://funeralai.substack.com/missing", 404, "missing", {}, None)
    monkeypatch.setattr(importer.urllib.request, "urlopen", missing)
    monkeypatch.setattr(importer, "ego_script", lambda _: pytest.fail("404 should not launch browser"))
    with pytest.raises(HTTPError):
        importer.fetch_text("https://funeralai.substack.com/missing")


def test_import_is_idempotent_and_handles_pagination(tmp_path, monkeypatch):
    (tmp_path / "001_2026-08-01_author_old.md").write_text("old")
    posts = [{"title": f"new{i}", "post_date": f"2026-08-{i+2:02}T00:00:00Z",
              "canonical_url": f"https://funeralai.substack.com/p/{i}", "author": "author"} for i in range(21)]
    pages = [list(reversed(posts[1:])), [posts[0], {"title": "old"}]]
    monkeypatch.setattr(importer, "parse_archive_posts", lambda _: pages.pop(0))
    monkeypatch.setattr(importer, "parse_feed_posts", lambda _: {p["canonical_url"]: "body" for p in posts})
    imported = importer.import_posts(source_dir=tmp_path, dry_run=False, limit=None, sync_authors=False)
    assert len(imported) == 21 and imported[0].name.startswith("002_")
    pages[:] = [list(reversed(posts[-20:]))]
    assert importer.import_posts(source_dir=tmp_path, dry_run=False, limit=None, sync_authors=False) == []


def test_rss_window_does_not_prevent_older_post_import(monkeypatch):
    monkeypatch.setattr(importer, "fetch_text", lambda _: json.dumps({"body_html": "<p>完整旧文</p>"}))
    post = importer.archive_to_post({"title": "old", "canonical_url": "https://funeralai.substack.com/p/old",
                                    "post_date": "2026-08-01T00:00:00Z", "author": "author"}, {})
    assert post.body_markdown == "完整旧文"


def test_new_aliases_are_counted_instead_of_pruned():
    article = {"id": "001", "title": "comparison", "path": "articles/001.md", "content_hash": "hash",
               "text": "K3的测试。K3的结果。"}
    artifact = normalize_article_extraction(article, {"entities": [
        {"name": "Kimi", "type": "product", "aliases": ["K3"], "description": "model"}], "relationships": []})
    assert artifact["entities"][0]["mention_count"] == 2


def test_excluded_draft_does_not_block_complete_graph():
    with patch("graph_builder.ready_article_ids", return_value=[]), patch("graph_builder.missing_article_ids", return_value=["139"]), patch("graph_builder.EXCLUDED_ARTICLES", {"139"}):
        full, graph, summary = build_graph_bundle_from_manifest({})
    assert full is not None and graph["metadata"]["isPartial"] is False


def test_unpublished_local_data_is_detected_even_without_new_imports(tmp_path):
    from release_guard import KEY_ASSETS, sha256_file
    for key in KEY_ASSETS:
        (tmp_path / Path(key).name).write_text("new")
    remote = {"hashes": {key: sha256_file(tmp_path / Path(key).name) for key in KEY_ASSETS}}
    assert not publication_needed(remote, tmp_path)
    (tmp_path / "article-index.json").write_text("updated")
    assert publication_needed(remote, tmp_path)


def test_failed_extraction_still_syncs_progress_for_next_worktree(tmp_path, monkeypatch):
    common = tmp_path / ".git"
    common.mkdir()
    monkeypatch.setattr(run_pipeline, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(run_pipeline.subprocess, "check_output", lambda *a, **k: str(common))
    calls = []
    def run(command, **kwargs):
        calls.append(command)
        return SimpleNamespace(returncode=0)
    monkeypatch.setattr(run_pipeline.subprocess, "run", run)
    monkeypatch.setattr(run_pipeline, "pending_articles", lambda: [{"id": "143"}])
    monkeypatch.setattr(run_pipeline, "run_extract", lambda args: 1)
    assert run_pipeline.run_update(SimpleNamespace()) == 1
    assert calls[-1] == ["bash", "scripts/sync_github_repo.sh", "--profile", "content"]


def test_glm_balance_error_429_switches_without_retry(monkeypatch):
    providers = [extractor.Provider(n, n, "https://" + n, "test-key") for n in ("glm", "kimi")]
    monkeypatch.setattr(extractor, "configured_providers", lambda: providers)
    extractor._unavailable_providers.clear()
    calls = []
    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(429, json={"error": {"code": "1113"}}) if request.url.host == "glm" else httpx.Response(200, json=response_payload())
    client_type = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client_type(transport=httpx.MockTransport(handler)))
    _, _, provider = asyncio.run(extractor.call_model("extract"))
    assert calls == ["glm", "kimi"] and provider.name == "kimi"
