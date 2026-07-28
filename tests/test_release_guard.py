from __future__ import annotations

import json
import shutil
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest
import release_guard

from release_guard import (
    ReleaseContractError,
    finalize_manifest,
    prepare_manifest,
    validate_benchmark,
    validate_site_data,
    verify_local,
    verify_remote,
)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")


def make_data(root: Path) -> None:
    articles = [
        {"id": "001", "date": "2026-01-01", "title": "One"},
        {"id": "002", "date": "2026-01-02", "title": "Two"},
    ]
    write_json(
        root / "article-index.json",
        {
            "count": 2,
            "articles": articles,
            "isPartial": False,
            "missingArticleIds": [],
        },
    )
    for article in articles:
        write_json(root / "articles" / f"{article['id']}.json", article)
    write_json(
        root / "graph-view.json",
        {
            "metadata": {
                "articleCount": 2,
                "isPartial": False,
                "missingArticleIds": [],
            },
            "nodes": [{"id": "a"}, {"id": "b"}],
            "links": [{"source": "a", "target": "b"}],
        },
    )
    write_json(root / "leaderboards.json", {"segments": []})


def make_static_routes(root: Path) -> None:
    for relative in (
        "index.html",
        "articles/index.html",
        "articles/002/index.html",
        "graph/index.html",
        "leaderboard/index.html",
    ):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("ok", encoding="utf-8")


def test_validate_site_data_accepts_consistent_graph_and_articles(tmp_path: Path) -> None:
    make_data(tmp_path)

    summary = validate_site_data(tmp_path)

    assert summary["articleCount"] == 2
    assert summary["latestArticleId"] == "002"
    assert summary["graphNodeCount"] == 2
    assert summary["graphLinkCount"] == 1


def test_validate_site_data_rejects_duplicate_articles_and_dangling_links(tmp_path: Path) -> None:
    make_data(tmp_path)
    index = json.loads((tmp_path / "article-index.json").read_text())
    index["articles"][1]["id"] = "001"
    write_json(tmp_path / "article-index.json", index)
    with pytest.raises(ReleaseContractError, match="duplicate article ids"):
        validate_site_data(tmp_path)

    make_data(tmp_path)
    graph = json.loads((tmp_path / "graph-view.json").read_text())
    graph["links"][0]["target"] = "missing"
    write_json(tmp_path / "graph-view.json", graph)
    with pytest.raises(ReleaseContractError, match="dangling links"):
        validate_site_data(tmp_path)


def test_validate_benchmark_rejects_entry_count_mismatch(tmp_path: Path) -> None:
    write_json(
        tmp_path / "manifest.json",
        {
            "releaseId": "test",
            "scoreStandard": "standard",
            "expectedEntries": 2,
            "entries": [{"id": "one"}],
        },
    )

    with pytest.raises(ReleaseContractError, match="entries mismatch"):
        validate_benchmark(tmp_path, "ci")


def test_finalize_and_verify_detect_artifact_mutation(tmp_path: Path) -> None:
    public_root = tmp_path / "public"
    out_root = tmp_path / "out"
    make_data(public_root / "data")
    prepare_manifest(public_root, "skip")
    shutil.copytree(public_root, out_root)
    make_static_routes(out_root)

    finalized = finalize_manifest(out_root, "skip", 100)
    assert verify_local(out_root, "skip", 100)["releaseId"] == finalized["releaseId"]

    (out_root / "index.html").write_text("changed", encoding="utf-8")
    with pytest.raises(ReleaseContractError, match="changed after release finalization"):
        verify_local(out_root, "skip", 100)


def test_remote_verifier_rejects_old_release_manifest(tmp_path: Path) -> None:
    public_root = tmp_path / "public"
    out_root = tmp_path / "out"
    make_data(public_root / "data")
    prepare_manifest(public_root, "skip")
    shutil.copytree(public_root, out_root)
    make_static_routes(out_root)
    expected = finalize_manifest(out_root, "skip", 100)

    handler = partial(SimpleHTTPRequestHandler, directory=str(out_root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    try:
        assert verify_remote(base_url, expected, attempts=1, delay=0)["releaseId"] == expected["releaseId"]
        stale = dict(expected)
        stale["releaseId"] = "older-release"
        write_json(out_root / "release-manifest.json", stale)
        with pytest.raises(ReleaseContractError, match="releaseId"):
            verify_remote(base_url, expected, attempts=1, delay=0)
    finally:
        server.shutdown()
        thread.join(timeout=5)


def test_remote_verifier_retries_contract_mismatch(monkeypatch):
    calls = 0

    def eventually_ready(base_url, expected):
        nonlocal calls
        calls += 1
        if calls < 3:
            raise ReleaseContractError("old hash")
        return expected

    monkeypatch.setattr(release_guard, "_verify_remote_once", eventually_ready)
    expected = {"releaseId": "ready"}

    assert verify_remote("https://example.test", expected, attempts=3, delay=0) == expected
    assert calls == 3
