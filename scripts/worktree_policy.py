#!/usr/bin/env python3
"""Validate the narrowly scoped worktree exception used by content automation."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


CANONICAL_ROOT = Path("/Users/xixiangyu/Documents/葬AI Web4")
AUTOMATION_ENV = "WEB4_AUTOMATION_WORKTREE"


def git_path(repo_root: Path, *args: str) -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--path-format=absolute", *args],
        cwd=repo_root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return Path(result.stdout.strip()).resolve()


def is_linked_to_canonical_repo(repo_root: Path, canonical_root: Path = CANONICAL_ROOT) -> bool:
    if repo_root.resolve() == canonical_root.resolve():
        return False
    try:
        common_dir = git_path(repo_root, "--git-common-dir")
    except (OSError, subprocess.CalledProcessError):
        return False
    return common_dir == (canonical_root / ".git").resolve()


def automation_worktree_allowed(
    repo_root: Path,
    profile: str,
    *,
    enabled: bool,
    canonical_root: Path = CANONICAL_ROOT,
) -> bool:
    return (
        enabled
        and profile == "content"
        and "append-" not in str(repo_root)
        and is_linked_to_canonical_repo(repo_root, canonical_root)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--canonical-root", type=Path, default=CANONICAL_ROOT)
    args = parser.parse_args()

    enabled = os.environ.get(AUTOMATION_ENV) == "1"
    if automation_worktree_allowed(
        args.repo_root,
        args.profile,
        enabled=enabled,
        canonical_root=args.canonical_root,
    ):
        print("trusted-content-automation-worktree")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
