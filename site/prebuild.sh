#!/bin/bash
# Copy generated web-data into public/data for static serving.
# web-data is the only supported source of truth for frontend assets.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_SRC="$PROJECT_ROOT/web-data"
DATA_DEST="$SCRIPT_DIR/public/data"

if [ ! -d "$DATA_SRC" ]; then
  echo "ERROR: web-data/ not found. Run the data pipeline before building the site." >&2
  exit 1
fi

for required_file in graph-view.json graph-shell.json graph-insights.json article-index.json leaderboards.json; do
  if [ ! -f "$DATA_SRC/$required_file" ]; then
    echo "ERROR: Missing required generated file: $DATA_SRC/$required_file" >&2
    exit 1
  fi
done

if [ ! -d "$DATA_SRC/articles" ]; then
  echo "ERROR: Missing generated article directory: $DATA_SRC/articles" >&2
  exit 1
fi

if [ ! -d "$DATA_SRC/entity-details" ]; then
  echo "ERROR: Missing generated entity detail directory: $DATA_SRC/entity-details" >&2
  exit 1
fi

echo "Copying data from $DATA_SRC to $DATA_DEST ..."

rm -rf "$DATA_DEST"
mkdir -p "$DATA_DEST/articles" "$DATA_DEST/entity-details"

cp "$DATA_SRC/graph-view.json" "$DATA_DEST/"
cp "$DATA_SRC/graph-shell.json" "$DATA_DEST/"
cp "$DATA_SRC/graph-insights.json" "$DATA_DEST/"
cp "$DATA_SRC/article-index.json" "$DATA_DEST/"
cp "$DATA_SRC/leaderboards.json" "$DATA_DEST/"
cp "$DATA_SRC"/articles/*.json "$DATA_DEST/articles/"
cp "$DATA_SRC"/entity-details/*.json "$DATA_DEST/entity-details/"

echo "Done. Copied $(ls "$DATA_DEST/articles/" | wc -l | tr -d ' ') article files, $(ls "$DATA_DEST/entity-details/" | wc -l | tr -d ' ') entity detail files, and 5 index files."

STAGE_TEST_MODE="${STAGE_TEST:-skip}"

case "$STAGE_TEST_MODE" in
  required|auto)
    if node -e 'const fs=require("fs");const p=process.argv[1];try{const m=JSON.parse(fs.readFileSync(p,"utf8"));process.exit(m.releaseId==="web4-graph-v2-first-official"?0:1)}catch{process.exit(1)}' "$SCRIPT_DIR/public/test/manifest.json"; then
      echo "Verifying frozen Graph V2 /test release (STAGE_TEST=$STAGE_TEST_MODE) ..."
      node "$SCRIPT_DIR/scripts/stage-graph-v2-benchmark.mjs" --verify-current
    else
      echo "Staging legacy isolated /test module (STAGE_TEST=$STAGE_TEST_MODE) ..."
      STAGE_TEST="$STAGE_TEST_MODE" node "$SCRIPT_DIR/scripts/stage-test-sites.mjs"
    fi
    ;;
  ci)
    echo "Staging deterministic compile-only /test fixture (STAGE_TEST=ci) ..."
    node "$SCRIPT_DIR/scripts/stage-test-ci-fixture.mjs"
    ;;
  skip)
    echo "Skipping isolated /test staging (STAGE_TEST=skip)."
    ;;
  *)
    echo "ERROR: STAGE_TEST must be required, auto, ci, or skip; got '$STAGE_TEST_MODE'." >&2
    exit 1
    ;;
esac

RELEASE_GUARD_MODE="$STAGE_TEST_MODE"
if [ "$RELEASE_GUARD_MODE" = "auto" ]; then
  RELEASE_GUARD_MODE="required"
fi
python3 "$PROJECT_ROOT/scripts/release_guard.py" prepare --mode "$RELEASE_GUARD_MODE"
