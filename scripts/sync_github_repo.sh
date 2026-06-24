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

content_paths=(
  "articles"
  "data"
  "web-data"
  "site/public/llms.txt"
  "README.md"
  "CHANGELOG.md"
  "pipeline.toml"
)

test_benchmark_paths=(
  ".env.example"
  ".gitignore"
  ".github"
  "AGENTS.md"
  "README.md"
  "CHANGELOG.md"
  "site/benchmark.local.example.json"
  "site/package.json"
  "site/package-lock.json"
  "site/prebuild.sh"
  "site/public/scoreboard-logo.png"
  "site/scripts"
  "site/src/app/(main)/test"
  "site/src/app/globals.css"
  "site/src/app/layout.tsx"
  "site/src/components/layout/Navbar.tsx"
  "site/src/components/layout/ThemeToggle.tsx"
  "site/src/components/test"
  "site/src/components/theme"
  "scripts/check_no_secrets.py"
  "scripts/deploy_site.sh"
  "scripts/doctor_repo.sh"
  "scripts/sync_github_repo.sh"
)

site_ui_paths=(
  ".env.example"
  ".gitignore"
  "AGENTS.md"
  "README.md"
  "CHANGELOG.md"
  "site/package.json"
  "site/package-lock.json"
  "site/prebuild.sh"
  "site/public"
  "site/scripts"
  "site/src"
  "scripts/check_no_secrets.py"
  "scripts/deploy_site.sh"
  "scripts/doctor_repo.sh"
  "scripts/sync_github_repo.sh"
)

allowed_paths=()
case "$profile" in
  content)
    allowed_paths=("${content_paths[@]}")
    ;;
  test-benchmark)
    allowed_paths=("${test_benchmark_paths[@]}")
    ;;
  site-ui)
    allowed_paths=("${site_ui_paths[@]}")
    ;;
  release)
    allowed_paths=("${content_paths[@]}" "${test_benchmark_paths[@]}" "${site_ui_paths[@]}")
    ;;
esac

if [[ -z "$(git status --porcelain=v1)" ]]; then
  echo "Working tree is clean; nothing to push."
  exit 0
fi

unexpected_paths=()
while IFS= read -r -d '' line; do
  [[ -z "$line" ]] && continue
  path="${line:3}"

  allowed=false
  for allowed_path in "${allowed_paths[@]}"; do
    if [[ "$path" == "$allowed_path" || "$path" == "$allowed_path/"* ]]; then
      allowed=true
      break
    fi
  done

  if [[ "$allowed" == false ]]; then
    unexpected_paths+=("$path")
  fi
done < <(git status --porcelain=v1 -z)

if (( ${#unexpected_paths[@]} > 0 )); then
  printf 'Refusing to push because unexpected local changes are present outside the %s sync scope:\n' "$profile" >&2
  printf '  %s\n' "${unexpected_paths[@]}" >&2
  exit 2
fi

python3 scripts/check_no_secrets.py

git add -- "${allowed_paths[@]}"

python3 scripts/check_no_secrets.py --staged

if git diff --cached --quiet; then
  echo "No syncable changes staged; nothing to commit."
  exit 0
fi

git commit -m "$commit_message"
git push origin main
