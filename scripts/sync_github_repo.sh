#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

profile="content"
commit_message=""

usage() {
  cat <<'EOF'
Usage: scripts/sync_github_repo.sh [--profile content|test-benchmark|site-ui|release] [commit message]

Commits and pushes only the paths allowed by the selected work profile.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      profile="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "$commit_message" ]]; then
        commit_message="$1"
      else
        commit_message="$commit_message $1"
      fi
      shift
      ;;
  esac
done

case "$profile" in
  content|test-benchmark|site-ui|release) ;;
  *)
    echo "Invalid profile: $profile" >&2
    exit 2
    ;;
esac

if [[ -z "$commit_message" ]]; then
  case "$profile" in
    content) commit_message="content: sync generated data" ;;
    test-benchmark) commit_message="test: sync benchmark scoring and UI" ;;
    site-ui) commit_message="site: sync UI updates" ;;
    release) commit_message="chore: sync release state" ;;
  esac
fi

python3 scripts/repo_profiles.py check-dirty --profile "$profile"

trusted_automation_worktree=false
if python3 scripts/worktree_policy.py \
  --repo-root "$repo_root" \
  --profile "$profile" >/dev/null; then
  trusted_automation_worktree=true
fi

branch="$(git branch --show-current || true)"
if [[ "$trusted_automation_worktree" == false && "$branch" != "main" ]]; then
  echo "GitHub sync requires main unless this is a trusted content-automation worktree." >&2
  exit 1
fi

python3 scripts/check_no_secrets.py

python3 scripts/repo_profiles.py stage --profile "$profile"

python3 scripts/check_no_secrets.py --staged

if git diff --cached --quiet; then
  echo "No syncable changes staged; nothing to commit."
else
  git commit -m "$commit_message"
fi

# A previous push can fail after commit; retry it even with a clean worktree.
if [[ "$trusted_automation_worktree" == true ]]; then
  git push origin HEAD:main
else
  git push origin main
fi
