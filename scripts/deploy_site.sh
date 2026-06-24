#!/usr/bin/env bash

set -euo pipefail

profile="release"

usage() {
  cat <<'EOF'
Usage: scripts/deploy_site.sh [--profile content|test-benchmark|site-ui|release]

Runs the Web4 deploy from the canonical local repo only.
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

scripts/doctor_repo.sh --profile "$profile"

echo "Running pre-deploy data pipeline and KG gate..."
python3 -m scripts.run_pipeline build
python3 scripts/kg_review_gate.py

echo "Building static site with explicit /test staging..."
(
  cd site
  STAGE_TEST=required npm run build
)

node <<'NODE'
const fs = require("node:fs");
const mainIndex = JSON.parse(fs.readFileSync("site/public/data/article-index.json", "utf8"));
const testManifest = JSON.parse(fs.readFileSync("site/public/test/manifest.json", "utf8"));
const testIndex = JSON.parse(fs.readFileSync("site/public/test/data/article-index.json", "utf8"));
const r6Doubao = testManifest.entries.find((entry) => entry.round === "r6" && entry.model === "Doubao");
console.log("Deploy summary");
console.log(`  main articles: ${mainIndex.count} (latest ${mainIndex.articles.at(-1)?.id})`);
console.log(`  test entries:  ${testManifest.entries.length}/${testManifest.expectedEntries}`);
console.log(`  test data:     ${testIndex.count} articles (latest ${testIndex.articles.at(-1)?.id})`);
console.log(`  score standard:${testManifest.scoreStandard}`);
console.log(`  r6 Doubao:     ${r6Doubao?.score} (old ${r6Doubao?.graphWeightedScore}, ${r6Doubao?.stabilityStatus})`);
NODE

echo "Deploying to Cloudflare Pages..."
(
  cd site
  env \
    -u ALL_PROXY -u all_proxy \
    -u HTTP_PROXY -u http_proxy \
    -u HTTPS_PROXY -u https_proxy \
    -u NO_PROXY -u no_proxy \
    wrangler pages deploy out --project-name funeral-ai-web4
)
