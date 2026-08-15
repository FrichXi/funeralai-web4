from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from worktree_policy import automation_worktree_allowed, is_linked_to_canonical_repo


def test_linked_worktree_requires_canonical_common_git_dir(tmp_path: Path):
    canonical = tmp_path / "canonical"
    worktree = tmp_path / "worktree"
    canonical.mkdir()
    worktree.mkdir()

    with patch(
        "worktree_policy.git_path",
        return_value=(canonical / ".git").resolve(),
    ):
        assert is_linked_to_canonical_repo(worktree, canonical)

    with patch(
        "worktree_policy.git_path",
        return_value=(tmp_path / "other" / ".git").resolve(),
    ):
        assert not is_linked_to_canonical_repo(worktree, canonical)


def test_automation_exception_is_content_only_and_explicit(tmp_path: Path):
    canonical = tmp_path / "canonical"
    worktree = tmp_path / "codex-worktree"

    with patch("worktree_policy.is_linked_to_canonical_repo", return_value=True):
        assert automation_worktree_allowed(
            worktree,
            "content",
            enabled=True,
            canonical_root=canonical,
        )
        assert not automation_worktree_allowed(
            worktree,
            "release",
            enabled=True,
            canonical_root=canonical,
        )
        assert not automation_worktree_allowed(
            worktree,
            "content",
            enabled=False,
            canonical_root=canonical,
        )


def test_append_worktrees_never_receive_the_exception(tmp_path: Path):
    with patch("worktree_policy.is_linked_to_canonical_repo", return_value=True):
        assert not automation_worktree_allowed(
            tmp_path / "append-20260815",
            "content",
            enabled=True,
            canonical_root=tmp_path / "canonical",
        )
