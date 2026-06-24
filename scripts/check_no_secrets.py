#!/usr/bin/env python3
"""Check public repo files and staged diffs for accidentally committed secrets."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path


SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("OpenAI-style API key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b")),
    ("Anthropic API key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{24,}\b")),
    ("Google API key", re.compile(r"\bAIza[A-Za-z0-9_-]{24,}\b")),
    ("Bearer token", re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{32,}\b")),
]

API_VALUE_PATTERN = re.compile(r"^\s*([A-Z0-9_]*API[_A-Z0-9]*KEY[A-Z0-9_]*)\s*=\s*(.+?)\s*$")
ALLOWED_VALUE_MARKERS = (
    "",
    "your-",
    "YOUR_",
    "<",
    "changeme",
    "placeholder",
)

DEFAULT_SCAN_PATHS = (
    ".env.example",
    "README.md",
    "CHANGELOG.md",
    "AGENTS.md",
    ".github",
    "scripts",
    "site/scripts",
)

SKIP_DIR_NAMES = {
    ".git",
    ".wrangler",
    ".next",
    "node_modules",
    "out",
    "output",
    "__pycache__",
}


def run_git(args: list[str], repo_root: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo_root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=check,
    )


def is_binary(path: Path) -> bool:
    try:
        with path.open("rb") as handle:
            chunk = handle.read(4096)
    except OSError:
        return True
    return b"\0" in chunk


def iter_scan_files(repo_root: Path, roots: list[str]) -> list[Path]:
    files: list[Path] = []

    for root_name in roots:
        root = repo_root / root_name
        if not root.exists():
            continue
        if root.is_file():
            files.append(root)
            continue
        for current_root, dir_names, file_names in os.walk(root):
            dir_names[:] = [name for name in dir_names if name not in SKIP_DIR_NAMES]
            for file_name in file_names:
                path = Path(current_root) / file_name
                if path.is_file() and not is_binary(path):
                    files.append(path)

    return sorted(set(files))


def allowed_api_value(value: str) -> bool:
    value = value.strip().strip('"').strip("'")
    return any(value.startswith(marker) for marker in ALLOWED_VALUE_MARKERS)


def scan_text(label: str, text: str) -> list[str]:
    findings: list[str] = []

    for line_number, line in enumerate(text.splitlines(), 1):
        api_value_match = API_VALUE_PATTERN.match(line)
        if api_value_match and not allowed_api_value(api_value_match.group(2)):
            findings.append(f"{label}:{line_number}: non-placeholder value for {api_value_match.group(1)}")

        for pattern_name, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(f"{label}:{line_number}: possible {pattern_name}")

    return findings


def scan_files(repo_root: Path, paths: list[str]) -> list[str]:
    findings: list[str] = []
    for path in iter_scan_files(repo_root, paths):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        label = str(path.relative_to(repo_root))
        findings.extend(scan_text(label, text))
    return findings


def scan_staged_diff(repo_root: Path) -> list[str]:
    result = run_git(["diff", "--cached", "--no-ext-diff", "--unified=0"], repo_root, check=False)
    if result.returncode not in (0, 1):
        raise RuntimeError(result.stderr.strip() or "git diff --cached failed")

    findings: list[str] = []
    current_file = "(staged diff)"
    added_lines: list[tuple[str, str]] = []

    for line in result.stdout.splitlines():
        if line.startswith("+++ b/"):
            current_file = line.removeprefix("+++ b/")
            continue
        if line.startswith("+") and not line.startswith("+++"):
            added_lines.append((current_file, line[1:]))

    grouped: dict[str, list[str]] = {}
    for file_name, line in added_lines:
        grouped.setdefault(file_name, []).append(line)

    for file_name, lines in grouped.items():
        findings.extend(scan_text(f"staged:{file_name}", "\n".join(lines)))

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staged", action="store_true", help="Also scan staged added lines.")
    parser.add_argument("paths", nargs="*", help="Optional paths to scan instead of the default public paths.")
    args = parser.parse_args()

    repo_root = Path(run_git(["rev-parse", "--show-toplevel"], Path.cwd()).stdout.strip())
    scan_paths = args.paths or list(DEFAULT_SCAN_PATHS)
    findings = scan_files(repo_root, scan_paths)

    if args.staged:
        findings.extend(scan_staged_diff(repo_root))

    if findings:
        print("Secret check failed:", file=sys.stderr)
        for finding in findings:
            print(f"  - {finding}", file=sys.stderr)
        return 1

    print("Secret check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
