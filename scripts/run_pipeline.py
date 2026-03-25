"""
run_pipeline.py -- Unified CLI entry point for the 葬AI knowledge graph pipeline.

Wraps existing scripts into a single command:
    python -m scripts.run_pipeline              # Full pipeline
    python -m scripts.run_pipeline extract      # Gemini extraction only
    python -m scripts.run_pipeline build        # Post-process + presentation
    python -m scripts.run_pipeline present      # Regenerate frontend data only
    python -m scripts.run_pipeline --articles 069 070  # Specific articles

Does NOT modify existing scripts -- wraps them via their public APIs.
"""
from __future__ import annotations

import argparse
import asyncio
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
    """Run Gemini extraction via extract_gemini.py."""
    from extract_gemini import load_project_env, main_async

    load_project_env(PROJECT_ROOT / ".env")

    if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("GEMINI_API_KEYS"):
        print("ERROR: Set GEMINI_API_KEY or GEMINI_API_KEYS in .env")
        return 1

    extract_args = SimpleNamespace(
        limit=args.limit,
        workers=args.workers,
        articles=args.articles,
        force=args.force,
        allow_partial_export=True,
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
    print("STAGE 1/3: Gemini Extraction")
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


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.run_pipeline",
        description="Unified CLI for the 葬AI knowledge graph pipeline",
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="full",
        choices=["full", "extract", "build", "present"],
        help="Pipeline stage to run (default: full)",
    )
    parser.add_argument("--articles", nargs="+", help="Specific article IDs (e.g. 069 070)")
    parser.add_argument("--limit", type=int, help="Process only first N articles")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent Gemini requests")
    parser.add_argument("--force", action="store_true", help="Force re-extraction")

    args = parser.parse_args()

    dispatch = {
        "full": run_full,
        "extract": run_extract,
        "build": run_build,
        "present": run_present,
    }

    handler = dispatch[args.command]
    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
