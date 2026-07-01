"""Read-only readiness audit for upcoming frontend refactors.

The report is intentionally about visibility, not policy enforcement. It makes
the article typography and benchmark expansion risks explicit before large UI
work starts.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
WEB_DATA = ROOT / "web-data"
SITE_PUBLIC_TEST = ROOT / "site" / "public" / "test"
LIVE_BASE_URL = "https://funeralai.cc"


ARTICLE_ENTRYPOINTS = [
    "site/src/components/article/ArticleBody.tsx",
    "site/src/app/(main)/articles/[id]/page.tsx",
    "site/src/app/(main)/articles/page.tsx",
    "scripts/build_presentation.py",
    "scripts/import_substack_articles.py",
]

BENCHMARK_ENTRYPOINTS = [
    "site/src/app/(main)/test/page.tsx",
    "site/src/app/(main)/test/methodology/page.tsx",
    "site/src/components/test/LeaderboardImageDownload.tsx",
    "site/scripts/stage-test-sites.mjs",
    "site/scripts/render-leaderboard-image.mjs",
]


@dataclass(frozen=True)
class ArticleParagraphMetrics:
    article_id: str
    title: str
    body_len: int
    paragraph_breaks: int
    single_newlines: int

    @property
    def newline_pressure(self) -> float:
        if self.paragraph_breaks <= 0:
            return float(self.single_newlines)
        return self.single_newlines / self.paragraph_breaks

    @property
    def has_paragraph_risk(self) -> bool:
        if self.body_len < 800:
            return False
        return self.paragraph_breaks < 6 or self.newline_pressure >= 12


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def classify_status_path(path: str) -> str:
    if path.startswith(("articles/", "data/", "web-data/")):
        return "content/data"
    if path in {"README.md", "site/public/llms.txt"}:
        return "content/data"
    if path.startswith("site/public/data/") or path.startswith("site/public/test/"):
        return "generated public"
    if path.startswith("site/src/") or path.startswith("site/scripts/"):
        return "frontend"
    if path == "scripts/frontend_refactor_readiness.py":
        return "docs/contracts"
    if path == "tests/test_frontend_refactor_readiness.py":
        return "docs/contracts"
    if path.startswith("docs/") or path in {"AGENTS.md", "CHANGELOG.md"}:
        return "docs/contracts"
    return "other"


def parse_git_status_line(line: str) -> str:
    # Handles normal porcelain lines and quoted non-ASCII paths well enough for
    # grouping; the raw path remains only for display.
    return line[3:] if len(line) > 3 else line


def git_status_lines() -> list[str]:
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def grouped_git_status(lines: Iterable[str]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    for line in lines:
        path = parse_git_status_line(line)
        group = classify_status_path(path.strip('"'))
        groups.setdefault(group, []).append(line)
    return groups


def article_metrics(article_path: Path) -> ArticleParagraphMetrics:
    payload = load_json(article_path)
    body = payload.get("body_markdown") or ""
    return ArticleParagraphMetrics(
        article_id=str(payload.get("id") or article_path.stem),
        title=str(payload.get("title") or ""),
        body_len=len(body),
        paragraph_breaks=body.count("\n\n"),
        single_newlines=body.count("\n"),
    )


def collect_article_metrics(limit: int) -> list[ArticleParagraphMetrics]:
    articles_dir = WEB_DATA / "articles"
    metrics = [article_metrics(path) for path in sorted(articles_dir.glob("*.json"))]
    risks = [item for item in metrics if item.has_paragraph_risk]
    return sorted(
        risks,
        key=lambda item: (-item.newline_pressure, item.paragraph_breaks, item.article_id),
    )[:limit]


def current_site_stats() -> dict[str, object]:
    article_index = load_json(WEB_DATA / "article-index.json")
    graph = load_json(WEB_DATA / "graph-view.json")
    articles = article_index.get("articles") or []
    latest = articles[-1] if articles else {}
    return {
        "article_count": article_index.get("count"),
        "node_count": len(graph.get("nodes") or []),
        "link_count": len(graph.get("links") or []),
        "latest_article": f"{latest.get('id', 'n/a')} {latest.get('title', '')}".strip(),
    }


def benchmark_status() -> dict[str, object]:
    manifest_path = SITE_PUBLIC_TEST / "manifest.json"
    if not manifest_path.exists():
        return {"present": False}

    manifest = load_json(manifest_path)
    entries = manifest.get("entries") or []
    frozen_index_path = SITE_PUBLIC_TEST / "data" / "article-index.json"
    frozen_index = load_json(frozen_index_path) if frozen_index_path.exists() else {}
    frozen_articles = frozen_index.get("articles") or []
    latest = frozen_articles[-1] if frozen_articles else {}
    return {
        "present": True,
        "score_standard": manifest.get("scoreStandard"),
        "data_version": manifest.get("dataVersion"),
        "snapshot_date": manifest.get("snapshotDate"),
        "expected_entries": manifest.get("expectedEntries"),
        "actual_entries": len(entries),
        "frozen_article_count": frozen_index.get("count"),
        "frozen_latest_article": f"{latest.get('id', 'n/a')} {latest.get('date', '')}".strip(),
    }


def benchmark_failures(benchmark: dict[str, object]) -> list[str]:
    failures: list[str] = []
    if not benchmark.get("present"):
        failures.append("missing staged /test manifest")
        return failures

    expected = benchmark.get("expected_entries")
    actual = benchmark.get("actual_entries")
    if expected != actual:
        failures.append(f"benchmark entries mismatch: {actual}/{expected}")

    for key in ("score_standard", "data_version", "snapshot_date"):
        if not benchmark.get(key):
            failures.append(f"benchmark manifest missing {key}")

    return failures


def read_live_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"user-agent": "frontend-refactor-readiness/1.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def live_status() -> dict[str, object]:
    try:
        article_index = read_live_json(f"{LIVE_BASE_URL}/data/article-index.json")
        test_manifest = read_live_json(f"{LIVE_BASE_URL}/test/manifest.json")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        return {"ok": False, "error": str(error)}

    articles = article_index.get("articles") or []
    latest = articles[-1] if articles else {}
    entries = test_manifest.get("entries") or []
    return {
        "ok": True,
        "article_count": article_index.get("count"),
        "latest_article": f"{latest.get('id', 'n/a')} {latest.get('title', '')}".strip(),
        "test_score_standard": test_manifest.get("scoreStandard"),
        "test_data_version": test_manifest.get("dataVersion"),
        "test_entries": len(entries),
        "test_expected_entries": test_manifest.get("expectedEntries"),
    }


def live_content_failures(local_stats: dict[str, object], live: dict[str, object]) -> list[str]:
    if not live.get("ok"):
        return [f"could not fetch live site metadata: {live.get('error')}"]

    failures: list[str] = []
    if live.get("article_count") != local_stats.get("article_count"):
        failures.append(
            "live article count differs from local web-data: "
            f"live={live.get('article_count')} local={local_stats.get('article_count')}"
        )
    return failures


def kg_gate_failures() -> list[str]:
    result = subprocess.run(
        ["python3", "scripts/kg_review_gate.py"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode == 0:
        return []

    output = f"{result.stdout}\n{result.stderr}"
    blocking_lines = [
        line.strip()
        for line in output.splitlines()
        if line.strip().startswith("- ") or line.strip().startswith("BLOCKING:")
    ]
    if blocking_lines:
        return ["KG review gate failed: " + " ".join(blocking_lines[-3:])]
    return ["KG review gate failed; run python3 scripts/kg_review_gate.py for details"]


def missing_paths(paths: Iterable[str]) -> list[str]:
    return [path for path in paths if not (ROOT / path).exists()]


def print_section(title: str) -> None:
    print(f"\n## {title}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--article-risk-limit",
        type=int,
        default=10,
        help="Maximum number of paragraph-risk articles to show.",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Also fetch funeralai.cc article/test metadata for cloud-state visibility.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit nonzero if frontend refactor prerequisites are missing.",
    )
    parser.add_argument(
        "--release-strict",
        action="store_true",
        help="Exit nonzero if live content or KG release gates are not aligned.",
    )
    args = parser.parse_args()
    if args.release_strict:
        args.live = True

    stats = current_site_stats()
    failures: list[str] = []
    print("# Frontend Refactor Readiness")
    print(
        f"Site data: {stats['article_count']} articles, {stats['node_count']} nodes, "
        f"{stats['link_count']} links; latest {stats['latest_article']}"
    )

    print_section("Entrypoints")
    article_missing = missing_paths(ARTICLE_ENTRYPOINTS)
    benchmark_missing = missing_paths(BENCHMARK_ENTRYPOINTS)
    print(f"Article typography entrypoints: {'OK' if not article_missing else 'missing ' + ', '.join(article_missing)}")
    print(f"Benchmark entrypoints: {'OK' if not benchmark_missing else 'missing ' + ', '.join(benchmark_missing)}")
    if args.strict or args.release_strict:
        failures.extend(f"missing article entrypoint: {path}" for path in article_missing)
        failures.extend(f"missing benchmark entrypoint: {path}" for path in benchmark_missing)

    print_section("Article Typography Risk")
    risks = collect_article_metrics(args.article_risk_limit)
    if not risks:
        print("No high-risk article paragraph shapes found.")
    else:
        for item in risks:
            print(
                f"- {item.article_id}: paragraphs={item.paragraph_breaks}, "
                f"newlines={item.single_newlines}, pressure={item.newline_pressure:.1f}, "
                f"title={item.title}"
            )

    print_section("Benchmark Snapshot")
    benchmark = benchmark_status()
    if not benchmark.get("present"):
        print("No staged /test manifest found. Use STAGE_TEST=required npm run stage:test for release validation.")
    else:
        print(f"scoreStandard: {benchmark['score_standard']}")
        print(f"dataVersion: {benchmark['data_version']}")
        print(f"snapshotDate: {benchmark['snapshot_date']}")
        print(f"entries: {benchmark['actual_entries']}/{benchmark['expected_entries']}")
        print(
            f"frozen data: {benchmark['frozen_article_count']} articles, "
            f"latest {benchmark['frozen_latest_article']}"
        )
    if args.strict or args.release_strict:
        failures.extend(benchmark_failures(benchmark))

    if args.live:
        print_section("Live Site")
        live = live_status()
        if not live.get("ok"):
            print(f"Could not fetch live site metadata: {live.get('error')}")
        else:
            print(f"articles: {live['article_count']}, latest {live['latest_article']}")
            print(
                f"benchmark: {live['test_entries']}/{live['test_expected_entries']}, "
                f"scoreStandard={live['test_score_standard']}"
            )
            print(f"benchmark dataVersion: {live['test_data_version']}")
        if args.release_strict:
            failures.extend(live_content_failures(stats, live))

    if args.release_strict:
        print_section("Release Gates")
        gate_failures = kg_gate_failures()
        if gate_failures:
            print("KG gate: BLOCKED")
            failures.extend(gate_failures)
        else:
            print("KG gate: OK")

    print_section("Dirty Worktree")
    groups = grouped_git_status(git_status_lines())
    if not groups:
        print("clean")
    else:
        for group in sorted(groups):
            print(f"{group}: {len(groups[group])}")
            for line in groups[group][:8]:
                print(f"  {line}")
            if len(groups[group]) > 8:
                print(f"  ... +{len(groups[group]) - 8} more")

    if args.strict or args.release_strict:
        print_section("Strict Result")
        if failures:
            for failure in failures:
                print(f"- {failure}")
            return 2
        print("OK")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
