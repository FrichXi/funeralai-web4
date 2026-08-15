#!/usr/bin/env python3
"""Build and verify the immutable contract for a 葬AI Web4 release."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SITE_ROOT = PROJECT_ROOT / "site"
DEFAULT_PUBLIC_ROOT = SITE_ROOT / "public"
DEFAULT_OUT_ROOT = SITE_ROOT / "out"
MANIFEST_NAME = "release-manifest.json"
SCHEMA_VERSION = "funeralai-release/v1"
DEFAULT_FILE_LIMIT = 19_000
CLI_MODES = ("required", "ci", "skip", "auto")
REQUIRED_ROUTES = (
    "/",
    "/articles/",
    "/graph/",
    "/leaderboard/",
    "/test/",
    "/test/methodology/",
    "/test/multimodal-model-analysis/",
)
KEY_ASSETS = (
    "data/article-index.json",
    "data/graph-view.json",
    "data/leaderboards.json",
)
BENCHMARK_KEY_ASSETS = (
    "test/manifest.json",
    "test/current-release.json",
    "images/test/web4-graph-v2-leaderboard-20260815-v3/model-leaderboard.png",
    "images/test/web4-graph-v2-leaderboard-20260815-v3/value-leaderboard.png",
    "images/test/multimodal-20260804/qwen38-formal-vs-preview-3d-four-view.png",
    "images/test/multimodal-20260804/six-models-3d-four-view-grid.png",
    "images/test/multimodal-20260804/four-models-mg-representative-frames.png",
)


class ReleaseContractError(RuntimeError):
    """Raised when a release violates a required invariant."""


@dataclass(frozen=True)
class TreeDigest:
    sha256: str
    files: int
    bytes: int


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ReleaseContractError(f"missing required JSON: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ReleaseContractError(f"invalid JSON {path}: {exc}") from exc


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False
    ) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
        temp_path = Path(handle.name)
    os.replace(temp_path, path)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    except FileNotFoundError as exc:
        raise ReleaseContractError(f"missing required file: {path}") from exc
    return digest.hexdigest()


def tree_digest(root: Path, excluded: Iterable[str] = ()) -> TreeDigest:
    if not root.is_dir():
        raise ReleaseContractError(f"missing tree root: {root}")

    excluded_set = set(excluded)
    digest = hashlib.sha256()
    file_count = 0
    byte_count = 0

    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        relative = path.relative_to(root).as_posix()
        if relative in excluded_set:
            continue
        size = path.stat().st_size
        file_hash = sha256_file(path)
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(str(size).encode("ascii"))
        digest.update(b"\0")
        digest.update(file_hash.encode("ascii"))
        digest.update(b"\n")
        file_count += 1
        byte_count += size

    return TreeDigest(digest.hexdigest(), file_count, byte_count)


def runtime_digest() -> TreeDigest:
    digest = hashlib.sha256()
    file_count = 0
    byte_count = 0
    candidates: list[Path] = [SITE_ROOT / "wrangler.toml"]
    for directory in (SITE_ROOT / "functions", SITE_ROOT / "migrations"):
        if directory.exists():
            candidates.extend(path for path in directory.rglob("*") if path.is_file())

    for path in sorted(candidates):
        if not path.is_file():
            continue
        relative = path.relative_to(PROJECT_ROOT).as_posix()
        size = path.stat().st_size
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(sha256_file(path).encode("ascii"))
        digest.update(b"\n")
        file_count += 1
        byte_count += size
    return TreeDigest(digest.hexdigest(), file_count, byte_count)


def git_identity() -> dict[str, Any]:
    def run(*args: str) -> bytes:
        result = subprocess.run(
            ["git", *args], cwd=PROJECT_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
        )
        if result.returncode != 0:
            raise ReleaseContractError(
                f"git {' '.join(args)} failed: {result.stderr.decode('utf-8', 'replace').strip()}"
            )
        return result.stdout

    head = run("rev-parse", "HEAD").decode().strip()
    branch = run("branch", "--show-current").decode().strip() or "detached"
    status = run("status", "--porcelain=v1", "-z")
    changed_count = len([item for item in status.split(b"\0") if item])
    return {
        "head": head,
        "branch": branch,
        "dirty": bool(status),
        "changedPathCount": changed_count,
        "statusSha256": sha256_bytes(status),
    }


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ReleaseContractError(message)


def validate_site_data(data_root: Path) -> dict[str, Any]:
    article_index = load_json(data_root / "article-index.json")
    graph = load_json(data_root / "graph-view.json")
    load_json(data_root / "leaderboards.json")

    articles = article_index.get("articles")
    _require(isinstance(articles, list) and articles, "article-index articles must be a non-empty list")
    article_ids = [str(item.get("id", "")) for item in articles]
    _require(all(article_ids), "article-index contains an empty article id")
    _require(len(article_ids) == len(set(article_ids)), "article-index contains duplicate article ids")
    _require(article_index.get("count") == len(articles), "article-index count does not match articles")
    _require(article_index.get("isPartial") is not True, "article-index is marked partial")
    _require(not article_index.get("missingArticleIds"), "article-index reports missing article ids")

    numeric_ids = [int(article_id) for article_id in article_ids if article_id.isdigit()]
    _require(len(numeric_ids) == len(article_ids), "article ids must be numeric strings")
    latest = max(articles, key=lambda item: int(str(item["id"])))

    article_dir = data_root / "articles"
    actual_article_files = {path.stem for path in article_dir.glob("*.json")}
    _require(
        actual_article_files == set(article_ids),
        "article detail files do not match article-index ids: "
        f"missing={sorted(set(article_ids) - actual_article_files)} "
        f"extra={sorted(actual_article_files - set(article_ids))}",
    )

    nodes = graph.get("nodes")
    links = graph.get("links")
    metadata = graph.get("metadata") or {}
    _require(isinstance(nodes, list), "graph nodes must be a list")
    _require(isinstance(links, list), "graph links must be a list")
    node_ids = [str(node.get("id", "")) for node in nodes]
    _require(all(node_ids), "graph contains an empty node id")
    _require(len(node_ids) == len(set(node_ids)), "graph contains duplicate node ids")
    node_id_set = set(node_ids)
    dangling = [
        index
        for index, link in enumerate(links)
        if str(link.get("source", "")) not in node_id_set or str(link.get("target", "")) not in node_id_set
    ]
    _require(not dangling, f"graph contains dangling links at indexes {dangling[:10]}")
    _require(
        metadata.get("articleCount") == len(articles),
        "graph metadata articleCount does not match article-index",
    )
    _require(metadata.get("isPartial") is not True, "graph is marked partial")
    _require(not metadata.get("missingArticleIds"), "graph reports missing article ids")

    return {
        "articleCount": len(articles),
        "latestArticleId": str(latest["id"]),
        "latestArticleDate": latest.get("date"),
        "latestArticleTitle": latest.get("title"),
        "graphArticleCount": metadata.get("articleCount"),
        "graphNodeCount": len(nodes),
        "graphLinkCount": len(links),
    }


def _url_to_path(root: Path, url_path: str) -> Path:
    parsed = urllib.parse.urlsplit(url_path)
    relative = parsed.path.lstrip("/")
    candidate = root / relative
    if parsed.path.endswith("/"):
        candidate = candidate / "index.html"
    return candidate


def validate_benchmark(test_root: Path, mode: str) -> dict[str, Any] | None:
    if mode == "skip":
        return None

    current_path = test_root / "current-release.json"
    current = load_json(current_path)
    rows = current.get("rows")
    _require(isinstance(rows, list) and len(rows) == 19, "current benchmark must contain 19 models")
    model_ids = [row.get("model_id") for row in rows]
    _require(all(model_ids), "current benchmark model_id is missing")
    _require(len(model_ids) == len(set(model_ids)), "current benchmark contains duplicate model_id values")
    for row in rows:
        scores = row.get("scores")
        _require(isinstance(scores, list) and len(scores) == 10, f"benchmark row must contain 10 scores: {row.get('model')}")
    _require(current.get("releaseId") == "web4-graph-v2-leaderboard-20260815-v3", "unexpected current benchmark releaseId")

    doubao = next((row for row in rows if row.get("model_id") == "volcengine-ark/doubao-seed-evolving"), None)
    _require(doubao is not None, "current benchmark is missing Doubao Seed Evolving")
    _require(doubao.get("score_mean") == 28.7, "Doubao frozen mean mismatch")
    _require(doubao.get("api_calls_10_tasks") == 179, "Doubao frozen call count mismatch")
    _require(doubao.get("cost_cny_10_tasks") == 13.178, "Doubao frozen cost mismatch")

    assets = current.get("assets") or {}
    for path_key, hash_key in (
        ("modelLeaderboardImage", "modelLeaderboardSha256"),
        ("valueLeaderboardImage", "valueLeaderboardSha256"),
    ):
        asset_path = _url_to_path(test_root.parent, str(assets.get(path_key, "")))
        _require(asset_path.is_file(), f"benchmark release image is missing: {asset_path}")
        _require(sha256_file(asset_path) == assets.get(hash_key), f"benchmark release image hash mismatch: {asset_path}")

    manifest_path = test_root / "manifest.json"
    manifest = load_json(manifest_path)
    entries = manifest.get("entries")
    artifact_expected = manifest.get("expectedEntries")
    _require(isinstance(entries, list) and entries, "raw benchmark entries must be a non-empty list")
    _require(artifact_expected == len(entries), f"raw benchmark entries mismatch: {len(entries)}/{artifact_expected}")
    entry_ids = [entry.get("id") or f"{entry.get('round')}:{entry.get('modelId') or entry.get('model')}" for entry in entries]
    _require(len(entry_ids) == len(set(entry_ids)), "raw benchmark contains duplicate entries")
    _require(bool(manifest.get("releaseId")), "raw benchmark releaseId is missing")
    _require(bool(manifest.get("scoreStandard")), "raw benchmark scoreStandard is missing")

    if mode == "required":
        for entry in entries:
            for field in ("href", "rawArchiveHref"):
                path = _url_to_path(test_root.parent, str(entry.get(field, "")))
                _require(path.is_file(), f"benchmark entry asset is missing: {path}")
        archive_manifest = test_root / "archive" / "2026-06-24-web4-rebuild" / "manifest.json"
        _require(archive_manifest.is_file(), "legacy benchmark archive manifest is missing")

    return {
        "releaseId": current.get("releaseId"),
        "scoreStandard": current.get("scoreFormula"),
        "modelCount": len(rows),
        "roundsPerModel": 10,
        "expectedEntries": len(rows) * 10,
        "actualEntries": sum(len(row["scores"]) for row in rows),
        "modelIds": model_ids,
        "selectionSha256": sha256_file(current_path),
        "rawArtifactReleaseId": manifest.get("releaseId"),
        "rawArtifactEntries": len(entries),
        "stageMode": mode,
    }


def key_hashes(root: Path, include_benchmark: bool) -> dict[str, str]:
    names = list(KEY_ASSETS)
    if include_benchmark:
        names.extend(BENCHMARK_KEY_ASSETS)
    return {name: sha256_file(root / name) for name in names}


def prepare_manifest(public_root: Path, mode: str) -> dict[str, Any]:
    data_summary = validate_site_data(public_root / "data")
    benchmark = validate_benchmark(public_root / "test", mode)
    runtime = runtime_digest()
    git = git_identity()
    hashes = key_hashes(public_root, benchmark is not None)
    identity_payload = json.dumps(
        {
            "schema": SCHEMA_VERSION,
            "mode": mode,
            "git": git,
            "hashes": hashes,
            "runtime": runtime.sha256,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    fingerprint = sha256_bytes(identity_payload)[:16]
    release_id = f"web4-{data_summary['latestArticleId']}-{fingerprint}"
    payload: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "releaseId": release_id,
        "generatedAt": utc_now(),
        "stageMode": mode,
        "git": git,
        "content": data_summary,
        "benchmark": benchmark,
        "hashes": hashes,
        "runtime": {
            "sha256": runtime.sha256,
            "files": runtime.files,
            "bytes": runtime.bytes,
        },
        "artifact": None,
    }
    write_json_atomic(public_root / MANIFEST_NAME, payload)
    return payload


def finalize_manifest(out_root: Path, mode: str, file_limit: int) -> dict[str, Any]:
    manifest_path = out_root / MANIFEST_NAME
    manifest = load_json(manifest_path)
    _require(manifest.get("schemaVersion") == SCHEMA_VERSION, "release manifest schema mismatch")
    _require(manifest.get("stageMode") == mode, "release manifest stage mode mismatch")
    payload_digest = tree_digest(out_root, excluded=(MANIFEST_NAME,))
    total_files = payload_digest.files + 1
    _require(total_files < file_limit, f"static export has {total_files} files; limit is {file_limit}")
    manifest["artifact"] = {
        "treeSha256": payload_digest.sha256,
        "treeFiles": payload_digest.files,
        "treeBytes": payload_digest.bytes,
        "totalFiles": total_files,
        "fileLimit": file_limit,
        "finalizedAt": utc_now(),
    }
    write_json_atomic(manifest_path, manifest)
    return manifest


def verify_local(out_root: Path, mode: str, file_limit: int) -> dict[str, Any]:
    manifest = load_json(out_root / MANIFEST_NAME)
    _require(manifest.get("schemaVersion") == SCHEMA_VERSION, "release manifest schema mismatch")
    _require(manifest.get("stageMode") == mode, "release manifest stage mode mismatch")
    _require(manifest.get("git") == git_identity(), "working tree changed after release manifest preparation")
    current_runtime = runtime_digest()
    _require(
        manifest.get("runtime")
        == {"sha256": current_runtime.sha256, "files": current_runtime.files, "bytes": current_runtime.bytes},
        "Pages Functions, migrations, or wrangler config changed after release preparation",
    )
    data_summary = validate_site_data(out_root / "data")
    benchmark = validate_benchmark(out_root / "test", mode)
    _require(manifest.get("content") == data_summary, "release manifest content summary is stale")
    _require(manifest.get("benchmark") == benchmark, "release manifest benchmark summary is stale")
    _require(
        manifest.get("hashes") == key_hashes(out_root, benchmark is not None),
        "release manifest hashes do not match site/out",
    )

    for route in REQUIRED_ROUTES:
        if route.startswith("/test/") and mode == "skip":
            continue
        route_path = out_root / (route.lstrip("/") or "index.html")
        if route.endswith("/") and route != "/":
            route_path = route_path / "index.html"
        _require(route_path.is_file(), f"required static route is missing: {route}")

    latest_id = data_summary["latestArticleId"]
    _require(
        (out_root / "articles" / latest_id / "index.html").is_file(),
        f"latest article route is missing: /articles/{latest_id}/",
    )

    artifact = manifest.get("artifact") or {}
    current = tree_digest(out_root, excluded=(MANIFEST_NAME,))
    total_files = current.files + 1
    _require(total_files < file_limit, f"static export has {total_files} files; limit is {file_limit}")
    _require(artifact.get("treeSha256") == current.sha256, "site/out changed after release finalization")
    _require(artifact.get("treeFiles") == current.files, "artifact file count changed")
    _require(artifact.get("treeBytes") == current.bytes, "artifact byte count changed")
    _require(artifact.get("totalFiles") == total_files, "artifact total file count changed")
    return manifest


def _request_bytes(url: str, attempts: int, delay: float) -> tuple[bytes, int]:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "funeralai-release-guard/1", "Cache-Control": "no-cache"},
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                return response.read(), response.status
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(delay)
    raise ReleaseContractError(f"request failed after {attempts} attempts: {url}: {last_error}")


def _remote_url(base_url: str, path: str, release_id: str) -> str:
    separator = "&" if "?" in path else "?"
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}{separator}release={urllib.parse.quote(release_id)}"


def _verify_remote_once(base_url: str, expected: dict[str, Any]) -> dict[str, Any]:
    release_id = str(expected.get("releaseId", ""))
    _require(bool(release_id), "expected release manifest has no releaseId")
    manifest_bytes, _ = _request_bytes(
        _remote_url(base_url, f"/{MANIFEST_NAME}", release_id), 1, 0
    )
    try:
        remote = json.loads(manifest_bytes)
    except json.JSONDecodeError as exc:
        raise ReleaseContractError(f"remote release manifest is invalid JSON: {exc}") from exc

    for field in ("schemaVersion", "releaseId", "stageMode", "content", "benchmark", "hashes", "runtime", "artifact"):
        _require(remote.get(field) == expected.get(field), f"remote release manifest mismatch: {field}")

    for relative, expected_hash in expected.get("hashes", {}).items():
        payload, _ = _request_bytes(_remote_url(base_url, f"/{relative}", release_id), 1, 0)
        _require(sha256_bytes(payload) == expected_hash, f"remote asset hash mismatch: {relative}")

    latest_id = str(expected["content"]["latestArticleId"])
    routes = [*REQUIRED_ROUTES, f"/articles/{latest_id}/"]
    if expected.get("stageMode") == "skip":
        routes = [route for route in routes if not route.startswith("/test/")]
    for route in routes:
        _request_bytes(_remote_url(base_url, route, release_id), 1, 0)

    benchmark = expected.get("benchmark")
    if benchmark is not None:
        test_manifest = json.loads(
            _request_bytes(_remote_url(base_url, "/test/manifest.json", release_id), 1, 0)[0]
        )
        model = (test_manifest.get("engineeringLeaderboard") or [{}])[0]
        model_slug = model.get("slug")
        if model_slug:
            query = urllib.parse.urlencode(
                {
                    "voterId": "release-healthcheck-read-only",
                    "leaderboardId": "model_total",
                    "benchmarkVersion": test_manifest.get("releaseId", release_id),
                    "modelSlug": model_slug,
                }
            )
            api_url = f"{base_url.rstrip('/')}/api/test/votes?{query}"
            api_payload = json.loads(_request_bytes(api_url, 1, 0)[0])
            _require(api_payload.get("ok") is True, "vote API read-only health check failed")

    return remote


def verify_remote(base_url: str, expected: dict[str, Any], attempts: int, delay: float) -> dict[str, Any]:
    last_error: ReleaseContractError | None = None
    for attempt in range(1, attempts + 1):
        try:
            return _verify_remote_once(base_url, expected)
        except ReleaseContractError as exc:
            last_error = exc
            if attempt < attempts:
                print(
                    f"Remote contract not ready ({attempt}/{attempts}): {exc}; retrying in {delay:g}s...",
                    file=sys.stderr,
                )
                time.sleep(delay)
    raise ReleaseContractError(
        f"remote contract did not converge after {attempts} attempts: {last_error}"
    )


def print_summary(manifest: dict[str, Any]) -> None:
    content = manifest.get("content") or {}
    benchmark = manifest.get("benchmark") or {}
    artifact = manifest.get("artifact") or {}
    print(f"Release: {manifest.get('releaseId')}")
    print(
        "Content: "
        f"{content.get('articleCount')} articles, "
        f"{content.get('graphNodeCount')} nodes, {content.get('graphLinkCount')} links"
    )
    if benchmark:
        print(f"Benchmark: {benchmark.get('actualEntries')}/{benchmark.get('expectedEntries')} ({benchmark.get('stageMode')})")
    if artifact:
        print(
            f"Artifact: {artifact.get('totalFiles')}/{artifact.get('fileLimit')} files, "
            f"tree {str(artifact.get('treeSha256'))[:16]}"
        )


def write_release_receipt(
    expected_manifest: Path,
    output_dir: Path,
    previous_deployment_id: str,
    previous_deployment_url: str,
    preview_url: str,
    production_deployment_id: str,
    production_url: str,
    custom_domain: str,
) -> dict[str, Any]:
    manifest = load_json(expected_manifest)
    payload = {
        "schemaVersion": "funeralai-release-receipt/v1",
        "releaseId": manifest.get("releaseId"),
        "completedAt": utc_now(),
        "previousProduction": {
            "deploymentId": previous_deployment_id,
            "url": previous_deployment_url,
        },
        "previewUrl": preview_url,
        "production": {
            "deploymentId": production_deployment_id,
            "url": production_url,
            "customDomain": custom_domain,
        },
        "artifact": manifest.get("artifact"),
        "content": manifest.get("content"),
        "benchmark": manifest.get("benchmark"),
        "verified": True,
    }
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    receipt_path = output_dir / f"release-{stamp}-{manifest.get('releaseId')}.json"
    write_json_atomic(receipt_path, payload)
    payload["receiptPath"] = str(receipt_path)
    return payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare = subparsers.add_parser("prepare", help="Generate the pre-build public release manifest.")
    prepare.add_argument("--public-root", type=Path, default=DEFAULT_PUBLIC_ROOT)
    prepare.add_argument("--mode", choices=CLI_MODES, required=True)

    finalize = subparsers.add_parser("finalize", help="Finalize the site/out tree digest.")
    finalize.add_argument("--out-root", type=Path, default=DEFAULT_OUT_ROOT)
    finalize.add_argument("--mode", choices=CLI_MODES, required=True)
    finalize.add_argument("--file-limit", type=int, default=int(os.environ.get("DEPLOY_FILE_LIMIT", DEFAULT_FILE_LIMIT)))

    local = subparsers.add_parser("verify-local", help="Verify a finalized static export.")
    local.add_argument("--out-root", type=Path, default=DEFAULT_OUT_ROOT)
    local.add_argument("--mode", choices=CLI_MODES, required=True)
    local.add_argument("--file-limit", type=int, default=int(os.environ.get("DEPLOY_FILE_LIMIT", DEFAULT_FILE_LIMIT)))

    remote = subparsers.add_parser("verify-remote", help="Verify a deployed release against a local manifest.")
    remote.add_argument("--base-url", required=True)
    remote.add_argument("--expected-manifest", type=Path, default=DEFAULT_OUT_ROOT / MANIFEST_NAME)
    remote.add_argument("--attempts", type=int, default=6)
    remote.add_argument("--delay", type=float, default=5.0)

    receipt = subparsers.add_parser("write-receipt", help="Record a successfully verified release.")
    receipt.add_argument("--expected-manifest", type=Path, default=DEFAULT_OUT_ROOT / MANIFEST_NAME)
    receipt.add_argument("--output-dir", type=Path, default=SITE_ROOT / ".release-receipts")
    receipt.add_argument("--previous-deployment-id", required=True)
    receipt.add_argument("--previous-deployment-url", required=True)
    receipt.add_argument("--preview-url", required=True)
    receipt.add_argument("--production-deployment-id", required=True)
    receipt.add_argument("--production-url", required=True)
    receipt.add_argument("--custom-domain", default="https://funeralai.cc")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if getattr(args, "mode", None) == "auto":
        args.mode = "required"
    try:
        if args.command == "prepare":
            manifest = prepare_manifest(args.public_root.resolve(), args.mode)
        elif args.command == "finalize":
            manifest = finalize_manifest(args.out_root.resolve(), args.mode, args.file_limit)
        elif args.command == "verify-local":
            manifest = verify_local(args.out_root.resolve(), args.mode, args.file_limit)
        elif args.command == "verify-remote":
            manifest = verify_remote(
                args.base_url,
                load_json(args.expected_manifest.resolve()),
                args.attempts,
                args.delay,
            )
        else:
            receipt = write_release_receipt(
                args.expected_manifest.resolve(),
                args.output_dir.resolve(),
                args.previous_deployment_id,
                args.previous_deployment_url,
                args.preview_url,
                args.production_deployment_id,
                args.production_url,
                args.custom_domain,
            )
            print(f"Release receipt: {receipt['receiptPath']}")
            return 0
        print_summary(manifest)
        return 0
    except ReleaseContractError as exc:
        print(f"Release guard failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
