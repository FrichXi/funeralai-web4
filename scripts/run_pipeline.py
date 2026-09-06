"""
run_pipeline.py -- Unified CLI entry point for the 葬AI knowledge graph pipeline.

Wraps existing scripts into a single command:
    python -m scripts.run_pipeline update       # Import, resume, deploy, sync
    python -m scripts.run_pipeline              # Extract and build data
    python -m scripts.run_pipeline extract      # Provider-failover extraction only
    python -m scripts.run_pipeline build        # Post-process + presentation
    python -m scripts.run_pipeline present      # Regenerate frontend data only
    python -m scripts.run_pipeline --articles 069 070  # Specific articles

Does NOT modify existing scripts -- wraps them via their public APIs.
"""
from __future__ import annotations

import argparse
import asyncio
import fcntl
import json
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

# Ensure scripts/ is importable
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

PROJECT_ROOT = SCRIPT_DIR.parent


def run_extract(args: argparse.Namespace) -> int:
    """Run Provider-failover extraction via extract_gemini.py."""
    from extract_gemini import load_project_env, main_async

    load_project_env(PROJECT_ROOT / ".env")

    extract_args = SimpleNamespace(
        limit=args.limit,
        workers=args.workers,
        articles=args.articles,
        force=args.force,
        allow_partial_export=False,
    )
    return asyncio.run(main_async(extract_args))


def run_post_process() -> int:
    """Run post_process.py to apply overrides."""
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "post_process.py")],
        cwd=str(PROJECT_ROOT),
    )
    return result.returncode


def run_build_graph() -> int:
    """Run build_graph.py to rebuild canonical graph layers."""
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "build_graph.py")],
        cwd=str(PROJECT_ROOT),
    )
    return result.returncode


def run_build_presentation() -> int:
    """Run build_presentation.py to generate frontend data."""
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "build_presentation.py")],
        cwd=str(PROJECT_ROOT),
    )
    return result.returncode


def run_full(args: argparse.Namespace) -> int:
    """Run the full pipeline: extract → post-process → presentation."""
    print("=" * 70)
    print("STAGE 1/3: Incremental extraction")
    print("=" * 70)
    rc = run_extract(args)
    if rc != 0:
        print(f"\nExtraction failed with code {rc}")
        return rc

    print("\n" + "=" * 70)
    print("STAGE 2/3: Post-Process (apply overrides)")
    print("=" * 70)
    rc = run_post_process()
    if rc != 0:
        print(f"\nPost-processing failed with code {rc}")
        return rc

    print("\n" + "=" * 70)
    print("STAGE 3/3: Build Presentation (frontend data)")
    print("=" * 70)
    rc = run_build_presentation()
    if rc != 0:
        print(f"\nPresentation build failed with code {rc}")
        return rc

    print("\n" + "=" * 70)
    print("Pipeline completed successfully.")
    print("=" * 70)
    return 0


def run_build(args: argparse.Namespace) -> int:
    """Rebuild graph + post-process + presentation (skip extraction)."""
    print("=" * 70)
    print("STAGE 1/3: Build canonical graph")
    print("=" * 70)
    rc = run_build_graph()
    if rc != 0:
        return rc

    print("\n" + "=" * 70)
    print("STAGE 2/3: Post-Process (apply overrides)")
    print("=" * 70)
    rc = run_post_process()
    if rc != 0:
        return rc

    print("\n" + "=" * 70)
    print("STAGE 3/3: Build Presentation (frontend data)")
    print("=" * 70)
    return run_build_presentation()


def run_present(args: argparse.Namespace) -> int:
    """Run presentation only (regenerate frontend JSON)."""
    return run_build_presentation()


def pending_articles() -> list[dict]:
    from overrides import EXCLUDED_ARTICLES
    from pipeline_state import extraction_decision, load_articles, load_manifest

    manifest = load_manifest()
    return [a for a in load_articles() if a["id"] not in EXCLUDED_ARTICLES
            and extraction_decision(a, manifest["articles"].get(a["id"]))[0]]


def publication_needed(remote: dict, data_root: Path) -> bool:
    from release_guard import KEY_ASSETS, sha256_file

    return any(remote.get("hashes", {}).get(key) != sha256_file(data_root / key.removeprefix("data/"))
               for key in KEY_ASSETS)


def run_update(args: argparse.Namespace) -> int:
    """Resume from source, extraction, published data and Git, never import count."""
    common = subprocess.check_output(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], text=True).strip()
    # Lock the shared Git directory so separate worktrees cannot publish over one another.
    descriptor = os.open(common, os.O_RDONLY)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(descriptor)
        print("Another content update is running; this run has nothing to do.")
        return 0
    try:
        canonical = Path(common).parent
        os.environ.setdefault("WEB4_AUTOMATION_WORKTREE", "1")
        os.environ.setdefault("TEST_BENCHMARK_DIR", str(canonical / "site/public/test"))
        if (canonical / "pipeline.local.toml").exists():
            from pipeline_state import _load_toml_file
            source = _load_toml_file(canonical / "pipeline.local.toml").get("articles", {}).get("source_dir")
            if source:
                os.environ.setdefault("ZANGAI_ARTICLES_SOURCE_DIR", source)
                import pipeline_state
                pipeline_state.ARTICLE_SOURCE_DIR = Path(os.environ["ZANGAI_ARTICLES_SOURCE_DIR"]).expanduser()

        subprocess.run([sys.executable, "-m", "scripts.import_substack_articles"], cwd=PROJECT_ROOT, check=True)
        from pipeline_state import load_manifest
        pending = pending_articles()
        if pending:
            if run_extract(args):
                return 1

        # Rebuild after a previous extraction succeeded but presentation/deployment failed.
        from build_presentation import stable_presentation_timestamp
        from release_guard import _request_bytes, load_json, validate_site_data
        index_path = PROJECT_ROOT / "web-data/article-index.json"
        if pending or not index_path.exists() or load_json(index_path).get("generatedAt") != stable_presentation_timestamp(load_manifest()):
            if run_build(args):
                return 1
            index = load_json(index_path)
            latest = max(index["articles"], key=lambda a: int(a["id"]))
            changelog = PROJECT_ROOT / "CHANGELOG.md"
            text = changelog.read_text(encoding="utf-8")
            entry = f"- Content update through {latest['id']}: {index['count']} articles; latest: {latest['title']}."
            if entry not in text:
                changelog.write_text(text.replace("## [Unreleased]", "## [Unreleased]\n\n" + entry, 1), encoding="utf-8")
        validate_site_data(PROJECT_ROOT / "web-data")
        remote = json.loads(_request_bytes("https://funeralai.cc/release-manifest.json", 3, 2)[0])
        if publication_needed(remote, PROJECT_ROOT / "web-data"):
            if not (PROJECT_ROOT / "site/node_modules/.bin/next").exists():
                subprocess.run(["npm", "ci", "--no-audit", "--no-fund"], cwd=PROJECT_ROOT / "site", check=True, timeout=600)
            subprocess.run(["bash", "scripts/deploy_site.sh", "--profile", "content"], cwd=PROJECT_ROOT, check=True)
        else:
            print("Source, local data and production match; no deployment needed.")
        return 0
    finally:
        # Persist progress even if extraction/build/deployment failed. A fresh
        # scheduled worktree can resume from Git instead of losing completed work.
        try:
            sync = subprocess.run(["bash", "scripts/sync_github_repo.sh", "--profile", "content"], cwd=PROJECT_ROOT)
            if sync.returncode and sys.exc_info()[0] is None:
                raise RuntimeError("GitHub sync failed; local progress is preserved. Rerun update.")
        finally:
            os.close(descriptor)


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.run_pipeline",
        description="Unified CLI for the 葬AI knowledge graph pipeline",
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="full",
        choices=["full", "extract", "build", "present", "update"],
        help="Pipeline stage to run (default: full)",
    )
    parser.add_argument("--articles", nargs="+", help="Specific article IDs (e.g. 069 070)")
    parser.add_argument("--limit", type=int, help="Process only first N articles")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent extraction requests")
    parser.add_argument("--force", action="store_true", help="Force re-extraction")

    args = parser.parse_args()

    dispatch = {
        "full": run_full,
        "extract": run_extract,
        "build": run_build,
        "present": run_present,
        "update": run_update,
    }

    handler = dispatch[args.command]
    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
