#!/usr/bin/env python3
"""Single source of truth for repository transaction profiles."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent

CONTENT_PATHS = (
    "articles",
    "data",
    "web-data",
    "site/public/llms.txt",
    "README.md",
    "CHANGELOG.md",
    "pipeline.toml",
    "requirements.txt",
    "scripts/build_presentation.py",
    "scripts/extract_gemini.py",
    "scripts/pipeline_state.py",
    "scripts/run_full_extraction.py",
    "scripts/run_pipeline.py",
)

TEST_BENCHMARK_PATHS = (
    ".env.example",
    ".gitignore",
    ".github",
    "AGENTS.md",
    "README.md",
    "CHANGELOG.md",
    "docs",
    "site/benchmark.local.example.json",
    "site/package.json",
    "site/package-lock.json",
    "site/prebuild.sh",
    "site/public/scoreboard-logo.png",
    "site/scripts",
    "site/src/app/(main)/test",
    "site/src/app/globals.css",
    "site/src/app/layout.tsx",
    "site/src/components/layout/Navbar.tsx",
    "site/src/components/layout/ThemeToggle.tsx",
    "site/src/components/test",
    "site/src/components/theme",
    "scripts/check_no_secrets.py",
    "scripts/deploy_site.sh",
    "scripts/doctor_repo.sh",
    "scripts/release_guard.py",
    "scripts/repo_profiles.py",
    "scripts/rollback_pages.py",
    "scripts/sync_github_repo.sh",
)

SITE_UI_PATHS = (
    ".env.example",
    ".gitignore",
    ".github",
    "AGENTS.md",
    "README.md",
    "CHANGELOG.md",
    "docs",
    "site/package.json",
    "site/package-lock.json",
    "site/prebuild.sh",
    "site/tailwind.config.ts",
    "site/tsconfig.json",
    "site/vitest.config.ts",
    "site/public",
    "site/scripts",
    "site/src",
    "site/functions",
    "site/migrations",
    "site/wrangler.toml",
    "requirements.txt",
    "scripts/check_no_secrets.py",
    "scripts/deploy_site.sh",
    "scripts/doctor_repo.sh",
    "scripts/frontend_refactor_readiness.py",
    "scripts/release_guard.py",
    "scripts/repo_profiles.py",
    "scripts/rollback_pages.py",
    "scripts/sync_github_repo.sh",
    "tests",
)

PROFILE_PATHS = {
    "content": CONTENT_PATHS,
    "test-benchmark": TEST_BENCHMARK_PATHS,
    "site-ui": SITE_UI_PATHS,
    "release": tuple(dict.fromkeys((*CONTENT_PATHS, *TEST_BENCHMARK_PATHS, *SITE_UI_PATHS, "scripts"))),
}


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        ["git", *args],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=check,
    )


def parse_porcelain_z(payload: bytes) -> list[str]:
    fields = payload.split(b"\0")
    paths: list[str] = []
    index = 0
    while index < len(fields):
        field = fields[index]
        index += 1
        if not field:
            continue
        if len(field) < 4:
            raise ValueError(f"invalid porcelain entry: {field!r}")
        status = field[:2]
        paths.append(field[3:].decode("utf-8", "surrogateescape"))
        if b"R" in status or b"C" in status:
            index += 1  # original path follows renamed/copied destination in -z mode
    return paths


def changed_paths() -> list[str]:
    result = run_git("status", "--porcelain=v1", "-z", "--untracked-files=all")
    return parse_porcelain_z(result.stdout)


def is_allowed(path: str, prefixes: tuple[str, ...]) -> bool:
    return any(path == prefix or path.startswith(f"{prefix}/") for prefix in prefixes)


def unexpected_paths(profile: str, paths: list[str]) -> list[str]:
    prefixes = PROFILE_PATHS[profile]
    return sorted(path for path in paths if not is_allowed(path, prefixes))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("list", "check-dirty", "stage"))
    parser.add_argument("--profile", choices=tuple(PROFILE_PATHS), required=True)
    args = parser.parse_args()

    if args.command == "list":
        print("\n".join(PROFILE_PATHS[args.profile]))
        return 0

    unexpected = unexpected_paths(args.profile, changed_paths())
    if unexpected:
        print(f"Unexpected changes outside the {args.profile} profile:", file=sys.stderr)
        for path in unexpected:
            print(f"  - {path}", file=sys.stderr)
        return 2

    if args.command == "stage":
        run_git("add", "--", *PROFILE_PATHS[args.profile])
        print(f"Staged paths allowed by the {args.profile} profile.")
    else:
        print(f"Dirty-worktree scope matches the {args.profile} profile.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
