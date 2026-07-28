from __future__ import annotations

from repo_profiles import parse_porcelain_z, unexpected_paths


def test_parse_porcelain_z_handles_spaces_and_renames():
    payload = b" M README.md\0?? site/src/file copy.tsx\0R  new name.tsx\0old name.tsx\0"

    assert parse_porcelain_z(payload) == ["README.md", "site/src/file copy.tsx", "new name.tsx"]


def test_content_profile_rejects_frontend_changes_but_release_accepts_them():
    paths = ["articles/125.md", "web-data/article-index.json", "site/src/app/page.tsx"]

    assert unexpected_paths("content", paths) == ["site/src/app/page.tsx"]
    assert unexpected_paths("release", paths) == []


def test_site_ui_profile_accepts_runtime_and_reliability_files():
    paths = [
        "site/functions/api/test/votes.js",
        "site/wrangler.toml",
        "scripts/release_guard.py",
        "tests/test_release_guard.py",
    ]

    assert unexpected_paths("site-ui", paths) == []

