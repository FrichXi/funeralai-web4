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

if [[ -z "$(git status --porcelain=v1)" ]]; then
  echo "Working tree is clean; nothing to push."
  exit 0
fi

python3 scripts/repo_profiles.py check-dirty --profile "$profile"

python3 scripts/check_no_secrets.py

python3 scripts/repo_profiles.py stage --profile "$profile"

python3 scripts/check_no_secrets.py --staged

if git diff --cached --quiet; then
  echo "No syncable changes staged; nothing to commit."
  exit 0
fi

git commit -m "$commit_message"
git push origin main
