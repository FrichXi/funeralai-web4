#!/bin/bash
# Copy web-data to public/data for static serving
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_SRC="$PROJECT_ROOT/web-data"
DATA_DEST="$SCRIPT_DIR/public/data"

echo "Copying data from $DATA_SRC to $DATA_DEST ..."

rm -rf "$DATA_DEST"
mkdir -p "$DATA_DEST/articles"

cp "$DATA_SRC/graph-view.json" "$DATA_DEST/"
cp "$DATA_SRC/article-index.json" "$DATA_DEST/"
cp "$DATA_SRC/leaderboards.json" "$DATA_DEST/"
cp "$DATA_SRC"/articles/*.json "$DATA_DEST/articles/"

echo "Done. Copied $(ls "$DATA_DEST/articles/" | wc -l | tr -d ' ') article files + 3 index files."
