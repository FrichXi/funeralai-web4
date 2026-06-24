#!/usr/bin/env bash

set -euo pipefail

CANONICAL_ROOT="/Users/xixiangyu/Documents/葬AI Web4"
profile="release"
ci_mode=false

usage() {
  cat <<'EOF'
Usage: scripts/doctor_repo.sh [--profile content|test-benchmark|site-ui|release] [--ci]

Checks repository hygiene before build, deploy, or GitHub sync.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      profile="${2:-}"
      shift 2
      ;;
    --ci)
      ci_mode=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
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

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

failures=()

fail() {
  failures+=("$1")
}

if [[ "$ci_mode" == false && "$repo_root" != "$CANONICAL_ROOT" ]]; then
  fail "Repository root is '$repo_root'; deployable root must be '$CANONICAL_ROOT'."
fi

if [[ "$ci_mode" == false && "$repo_root" == *"/append-"* ]]; then
  fail "Repository root looks like an append/test worktree: $repo_root."
fi

branch="$(git branch --show-current || true)"
head="$(git rev-parse --short HEAD)"
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"

echo "Repo doctor"
echo "  root:    $repo_root"
echo "  profile: $profile"
echo "  branch:  ${branch:-detached}"
echo "  head:    $head"
echo "  upstream:${upstream:+ $upstream}"

if [[ -n "$branch" && "$branch" != "main" ]]; then
  fail "Current branch is '$branch'; expected 'main'."
fi

if ! python3 scripts/check_no_secrets.py --staged >/tmp/web4-secret-check.log 2>&1; then
  cat /tmp/web4-secret-check.log >&2
  fail "Secret check failed."
else
  cat /tmp/web4-secret-check.log
fi

tracked_generated=()
while IFS= read -r path; do
  [[ -n "$path" ]] && tracked_generated+=("$path")
done < <(git ls-files site/public/data site/public/test data/graph/canonical_full.json)

if (( ${#tracked_generated[@]} > 0 )); then
  fail "Generated files are still tracked: ${tracked_generated[*]}"
fi

for path in ".wrangler/cache/pages.json" "site/output/playwright/test-page-desktop.png" "Web4/website/index.html" "website/assets/js/data-loader.js" "site/benchmark.local.json"; do
  if [[ -e "$path" ]] && ! git check-ignore -q "$path"; then
    fail "Local/generated path is not ignored: $path"
  fi
done

if [[ "$profile" == "test-benchmark" || "$profile" == "release" ]]; then
  if [[ "$ci_mode" == false ]]; then
    config_path="${TEST_BENCHMARK_CONFIG:-site/benchmark.local.json}"
    if [[ ! -f "$config_path" ]]; then
      fail "Missing benchmark config: $config_path"
    else
      node - "$config_path" <<'NODE' || fail "Benchmark config points to missing required files."
const fs = require("node:fs");
const path = require("node:path");
const configPath = process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const sourceRoot = process.env.TEST_SOURCE_ROOT || config.sourceRoot;
if (!sourceRoot) {
  throw new Error("sourceRoot is required");
}
const required = [
  sourceRoot,
  process.env.TEST_RECHECK_DIR || config.recheckDir || path.join(sourceRoot, "append-20260623", "stability-full-20260624"),
  process.env.TEST_GRAPHWEIGHTED_RECHECK_DIR || config.graphWeightedRecheckDir || path.join(sourceRoot, "append-20260623"),
  process.env.TEST_SHARED_DATA_DIR || config.testSharedDataDir || path.join(sourceRoot, "append-20260623", "web4-b110bf9", "web-data"),
];
const missing = required.filter((item) => !fs.existsSync(item));
if (missing.length) {
  throw new Error(`Missing benchmark paths:\n${missing.join("\n")}`);
}
console.log(`Benchmark config OK: ${sourceRoot}`);
NODE
    fi
  else
    echo "CI mode: skipping canonical benchmark-local config check."
  fi
fi

if (( ${#failures[@]} > 0 )); then
  echo "Repo doctor failed:" >&2
  for item in "${failures[@]}"; do
    echo "  - $item" >&2
  done
  exit 1
fi

echo "Repo doctor passed."
