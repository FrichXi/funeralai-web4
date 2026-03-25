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

for required_file in graph-view.json article-index.json leaderboards.json; do
  if [ ! -f "$DATA_SRC/$required_file" ]; then
    echo "ERROR: Missing required generated file: $DATA_SRC/$required_file" >&2
    exit 1
  fi
done

if [ ! -d "$DATA_SRC/articles" ]; then
  echo "ERROR: Missing generated article directory: $DATA_SRC/articles" >&2
  exit 1
fi

echo "Copying data from $DATA_SRC to $DATA_DEST ..."

rm -rf "$DATA_DEST"
mkdir -p "$DATA_DEST/articles"

cp "$DATA_SRC/graph-view.json" "$DATA_DEST/"
cp "$DATA_SRC/article-index.json" "$DATA_DEST/"
cp "$DATA_SRC/leaderboards.json" "$DATA_DEST/"
cp "$DATA_SRC"/articles/*.json "$DATA_DEST/articles/"

echo "Done. Copied $(ls "$DATA_DEST/articles/" | wc -l | tr -d ' ') article files + 3 index files."
