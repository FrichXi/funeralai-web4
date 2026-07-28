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
python3 scripts/frontend_refactor_readiness.py --strict

echo "Running release test suite..."
python3 -m pytest tests -q
(
  cd site
  npm run check
)

echo "Building static site with explicit /test staging..."
(
  cd site
  STAGE_TEST=required npm run build
)

python3 scripts/release_guard.py verify-local --mode required

release_id="$(python3 -c 'import json;print(json.load(open("site/out/release-manifest.json"))["releaseId"])')"
git_head="$(git rev-parse HEAD)"
git_dirty="$(python3 -c 'import json;print(str(json.load(open("site/out/release-manifest.json"))["git"]["dirty"]).lower())')"
project_name="funeral-ai-web4"
custom_domain="https://funeralai.cc"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

cloudflare() {
  (
    cd site
    env \
      -u ALL_PROXY -u all_proxy \
      -u HTTP_PROXY -u http_proxy \
      -u HTTPS_PROXY -u https_proxy \
      -u NO_PROXY -u no_proxy \
      npx --no-install wrangler "$@"
  )
}

extract_deployment_url() {
  python3 - "$1" <<'PY'
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
matches = re.findall(r"https://[a-f0-9]{8}\.funeral-ai-web4\.pages\.dev", text)
if not matches:
    raise SystemExit("Could not find the unique Pages deployment URL in Wrangler output")
print(matches[-1])
PY
}

current_production() {
  cloudflare pages deployment list \
    --project-name "$project_name" \
    --environment production \
    --json >"$temp_dir/production.json"
  python3 - "$temp_dir/production.json" <<'PY'
import json
import sys

rows = json.load(open(sys.argv[1], encoding="utf-8"))
if not rows:
    raise SystemExit("No production deployment found")
print(f"{rows[0]['Id']}\t{rows[0]['Deployment']}")
PY
}

echo "Deploying immutable release candidate: $release_id"
cloudflare pages deploy out \
  --project-name "$project_name" \
  --branch release-candidate \
  --commit-hash "$git_head" \
  --commit-message "release candidate: $release_id" \
  --commit-dirty "$git_dirty" 2>&1 | tee "$temp_dir/preview.log"
preview_url="$(extract_deployment_url "$temp_dir/preview.log")"
python3 scripts/release_guard.py verify-remote \
  --base-url "$preview_url" \
  --expected-manifest site/out/release-manifest.json

# Prove that preview verification did not change the directory that will be promoted.
python3 scripts/release_guard.py verify-local --mode required

IFS=$'\t' read -r previous_deployment_id previous_deployment_url < <(current_production)
if [[ -z "$previous_deployment_id" || -z "$previous_deployment_url" ]]; then
  echo "Could not identify the previous production deployment; refusing promotion." >&2
  exit 1
fi
echo "Previous production: $previous_deployment_id ($previous_deployment_url)"

echo "Promoting the same site/out tree to production..."
cloudflare pages deploy out \
  --project-name "$project_name" \
  --branch main \
  --commit-hash "$git_head" \
  --commit-message "release: $release_id" \
  --commit-dirty "$git_dirty" 2>&1 | tee "$temp_dir/production.log"
production_url="$(extract_deployment_url "$temp_dir/production.log")"

IFS=$'\t' read -r production_deployment_id listed_production_url < <(current_production)
if [[ "$listed_production_url" != "$production_url" ]]; then
  echo "Newest production deployment does not match the uploaded URL; refusing to claim success." >&2
  exit 1
fi

set +e
python3 scripts/release_guard.py verify-remote \
  --base-url "$production_url" \
  --expected-manifest site/out/release-manifest.json
unique_verify_status=$?
python3 scripts/release_guard.py verify-remote \
  --base-url "$custom_domain" \
  --expected-manifest site/out/release-manifest.json \
  --attempts 24 \
  --delay 5
custom_verify_status=$?
set -e

if (( unique_verify_status != 0 || custom_verify_status != 0 )); then
  echo "Production verification failed. Stop all further writes." >&2
  echo "Validated rollback target: $previous_deployment_id ($previous_deployment_url)" >&2
  echo "Dry-run rollback command:" >&2
  echo "  python3 scripts/rollback_pages.py --deployment-id $previous_deployment_id" >&2
  exit 1
fi

python3 scripts/release_guard.py write-receipt \
  --previous-deployment-id "$previous_deployment_id" \
  --previous-deployment-url "$previous_deployment_url" \
  --preview-url "$preview_url" \
  --production-deployment-id "$production_deployment_id" \
  --production-url "$production_url" \
  --custom-domain "$custom_domain"

echo "Release verified on preview, unique production URL, and custom domain."
