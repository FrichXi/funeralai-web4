#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

commit_message="${1:-content: sync generated data}"

allowed_paths=(
  "articles"
  "data"
  "web-data"
  "site/public/data"
  "site/public/llms.txt"
  "README.md"
  "CHANGELOG.md"
  "pipeline.toml"
)

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
  printf 'Refusing to push because unexpected local changes are present outside the sync scope:\n' >&2
  printf '  %s\n' "${unexpected_paths[@]}" >&2
  exit 2
fi

git add -- "${allowed_paths[@]}"

if git diff --cached --quiet; then
  echo "No syncable changes staged; nothing to commit."
  exit 0
fi

git commit -m "$commit_message"
git push origin main
