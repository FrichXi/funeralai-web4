"""
pipeline_state.py -- Manifest management, article loading, and pipeline constants.

Manages the incremental extraction state via articles_manifest.json:
  - Tracks which articles need extraction (new/changed/failed)
  - Provides path utilities for all pipeline directories
  - Loads pipeline configuration from pipeline.toml (with defaults)

Key functions:
  - article_record_from_path()  -- Parse article filename into metadata
  - extraction_decision()       -- Determine if an article needs re-extraction
  - sync_manifest()             -- Align manifest with current articles directory
"""
from __future__ import annotations

import hashlib
import json
import re
import warnings
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = PROJECT_ROOT / "articles"
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "gemini_raw"
EXTRACTED_DIR = DATA_DIR / "extracted"
GRAPH_DIR = DATA_DIR / "graph"
STATE_DIR = DATA_DIR / "state"
MANIFEST_FILE = STATE_DIR / "articles_manifest.json"
CANONICAL_FULL_GRAPH_FILE = GRAPH_DIR / "canonical_full.json"
CANONICAL_GRAPH_FILE = GRAPH_DIR / "canonical.json"
PIPELINE_TOML = PROJECT_ROOT / "pipeline.toml"

# ── Article filename validation ──
ARTICLE_FILENAME_RE = re.compile(r"^\d{3}_\d{4}-\d{2}-\d{2}_[^_]+_.+\.md$")


def _load_pipeline_config() -> dict:
    """Load pipeline.toml if it exists, return empty dict otherwise.
    Uses tomllib (Python 3.11+) or falls back to a simple TOML parser."""
    if not PIPELINE_TOML.exists():
        return {}
    try:
        import tomllib
    except ModuleNotFoundError:
        try:
            import tomli as tomllib  # type: ignore[no-redef]
        except ModuleNotFoundError:
            # Minimal fallback: parse key = "value" lines
            config: dict = {}
            section = ""
            for line in PIPELINE_TOML.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("["):
                    section = line.strip("[]").strip()
                    config.setdefault(section, {})
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    try:
                        val = int(val)
                    except (ValueError, TypeError):
                        pass
                    if section:
                        config.setdefault(section, {})[key] = val
                    else:
                        config[key] = val
            return config
    with open(PIPELINE_TOML, "rb") as f:
        return tomllib.load(f)


_PIPELINE_CONFIG = _load_pipeline_config()

EXTRACTOR_NAME = "gemini"
MODEL_NAME = _PIPELINE_CONFIG.get("pipeline", {}).get("model", "gemini-3.1-pro-preview")
PROMPT_VERSION = _PIPELINE_CONFIG.get("pipeline", {}).get("prompt_version", "2026-03-15-vc-firm-relationship-v7")
EXTRACTOR_VERSION = _PIPELINE_CONFIG.get("pipeline", {}).get("extractor_version", "2026-03-15-overrides-pipeline-v5")
GRAPH_SCHEMA_VERSION = _PIPELINE_CONFIG.get("pipeline", {}).get("graph_schema_version", "2026-03-15-vc-firm-v3")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ensure_pipeline_dirs() -> None:
    for path in (DATA_DIR, RAW_DIR, EXTRACTED_DIR, GRAPH_DIR, STATE_DIR):
        path.mkdir(parents=True, exist_ok=True)


def load_json_file(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json_file(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def should_drop_credit_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False

    lower = stripped.lower()
    if "本文配图由" in stripped or "配图由" in stripped:
        return True
    if "辅助写作" in stripped and any(token in lower for token in ("chatgpt", "gpt", "claude", "gemini", "qwen", "deepseek", "kimi", "grimo")):
        return True
    return False


def extract_article_body(raw_text: str) -> str:
    lines = raw_text.splitlines()
    separators = [index for index, line in enumerate(lines) if line.strip() == "---"]

    if len(separators) >= 2 and separators[0] < separators[-1]:
        body_lines = lines[separators[0] + 1:separators[-1]]
    else:
        body_lines = lines

    cleaned_lines = []
    for line in body_lines:
        if should_drop_credit_line(line):
            continue
        cleaned_lines.append(line.rstrip())

    while cleaned_lines and not cleaned_lines[0].strip():
        cleaned_lines.pop(0)
    while cleaned_lines and not cleaned_lines[-1].strip():
        cleaned_lines.pop()

    body = "\n".join(cleaned_lines)
    body = body.strip()
    while "\n\n\n" in body:
        body = body.replace("\n\n\n", "\n\n")
    return body


def article_record_from_path(path: Path) -> dict:
    if not ARTICLE_FILENAME_RE.match(path.name):
        warnings.warn(
            f"Article filename does not match expected format "
            f"'NNN_YYYY-MM-DD_author_title.md': {path.name}",
            stacklevel=2,
        )
    parts = path.stem.split("_", 3)
    raw_text = path.read_text(encoding="utf-8")
    body_text = extract_article_body(raw_text)
    title = parts[3] if len(parts) > 3 else path.stem
    return {
        "id": parts[0] if len(parts) > 0 else path.stem,
        "date": parts[1] if len(parts) > 1 else "",
        "author": parts[2] if len(parts) > 2 else "",
        "title": title,
        "path": str(path.relative_to(PROJECT_ROOT)),
        "text": body_text,
        "raw_text": raw_text,
        "prompt_text": f"标题：{title}\n\n正文：\n{body_text}",
        "content_hash": sha256_text(raw_text),
    }


def load_articles(limit: int | None = None, article_ids: list[str] | None = None) -> list[dict]:
    selected = set(article_ids or [])
    articles = []
    for path in sorted(ARTICLES_DIR.glob("*.md")):
        if path.name.startswith("00_"):
            continue
        record = article_record_from_path(path)
        if selected and record["id"] not in selected:
            continue
        articles.append(record)
        if limit and len(articles) >= limit:
            break
    return articles


def extracted_artifact_path(article_id: str) -> Path:
    return EXTRACTED_DIR / f"{article_id}.json"


def raw_result_path(article_id: str) -> Path:
    return RAW_DIR / f"{article_id}.json"


def raw_debug_path(article_id: str) -> Path:
    return RAW_DIR / f"{article_id}_raw.txt"


def article_permalink(article_id: str) -> str:
    return f"/articles/{article_id}"


def article_markdown_link(article_path: str) -> str:
    return article_path


def empty_manifest() -> dict:
    return {
        "version": 1,
        "updatedAt": utc_now(),
        "pipeline": {
            "extractor": EXTRACTOR_NAME,
            "model": MODEL_NAME,
            "prompt_version": PROMPT_VERSION,
            "extractor_version": EXTRACTOR_VERSION,
            "graph_schema_version": GRAPH_SCHEMA_VERSION,
        },
        "articles": {},
    }


def load_manifest() -> dict:
    manifest = load_json_file(MANIFEST_FILE, empty_manifest())
    manifest.setdefault("version", 1)
    manifest.setdefault("updatedAt", utc_now())
    manifest.setdefault("pipeline", {})
    manifest.setdefault("articles", {})
    return manifest


def save_manifest(manifest: dict) -> None:
    manifest["updatedAt"] = utc_now()
    manifest["pipeline"] = {
        "extractor": EXTRACTOR_NAME,
        "model": MODEL_NAME,
        "prompt_version": PROMPT_VERSION,
        "extractor_version": EXTRACTOR_VERSION,
        "graph_schema_version": GRAPH_SCHEMA_VERSION,
    }
    save_json_file(MANIFEST_FILE, manifest)


def build_manifest_entry(article: dict, existing: dict | None = None) -> dict:
    existing = existing or {}
    return {
        "article_id": article["id"],
        "path": article["path"],
        "title": article["title"],
        "date": article.get("date", ""),
        "author": article.get("author", ""),
        "content_hash": article["content_hash"],
        "status": existing.get("status", "pending"),
        "reason": existing.get("reason", "new_article"),
        "artifact_path": existing.get("artifact_path"),
        "raw_path": existing.get("raw_path"),
        "extracted_at": existing.get("extracted_at"),
        "last_error": existing.get("last_error"),
        "extractor": existing.get("extractor", {
            "name": EXTRACTOR_NAME,
            "model": MODEL_NAME,
            "prompt_version": PROMPT_VERSION,
            "extractor_version": EXTRACTOR_VERSION,
        }),
    }


def sync_manifest(manifest: dict, articles: list[dict]) -> dict:
    current_ids = {article["id"] for article in articles}
    synced = {}

    for article in articles:
        synced[article["id"]] = build_manifest_entry(article, manifest.get("articles", {}).get(article["id"]))

    for article_id, entry in manifest.get("articles", {}).items():
        if article_id in current_ids:
            continue
        removed = dict(entry)
        removed["status"] = "removed"
        removed["reason"] = "article_removed"
        synced[article_id] = removed

    manifest["articles"] = synced
    return manifest


def extraction_decision(article: dict, manifest_entry: dict | None, force: bool = False) -> tuple[bool, str]:
    artifact_path = extracted_artifact_path(article["id"])
    if force:
        return True, "forced"
    if manifest_entry is None:
        return True, "new_article"
    if manifest_entry.get("status") == "removed":
        return False, "removed"
    if manifest_entry.get("content_hash") != article["content_hash"]:
        return True, "content_changed"

    extractor = manifest_entry.get("extractor", {})
    if extractor.get("model") != MODEL_NAME:
        return True, "model_changed"
    if extractor.get("prompt_version") != PROMPT_VERSION:
        return True, "prompt_changed"
    if extractor.get("extractor_version") != EXTRACTOR_VERSION:
        return True, "extractor_changed"
    if not artifact_path.exists():
        return True, "missing_artifact"
    if manifest_entry.get("status") != "ready":
        return True, "status_not_ready"
    return False, "up_to_date"


def mark_article_pending(manifest: dict, article: dict, reason: str) -> None:
    entry = build_manifest_entry(article, manifest["articles"].get(article["id"]))
    entry["status"] = "pending"
    entry["reason"] = reason
    entry["last_error"] = None
    manifest["articles"][article["id"]] = entry


def mark_article_ready(manifest: dict, article: dict, reason: str) -> None:
    entry = build_manifest_entry(article, manifest["articles"].get(article["id"]))
    entry["status"] = "ready"
    entry["reason"] = reason
    entry["artifact_path"] = str(extracted_artifact_path(article["id"]).relative_to(PROJECT_ROOT))
    entry["raw_path"] = str(raw_result_path(article["id"]).relative_to(PROJECT_ROOT))
    entry["extracted_at"] = utc_now()
    entry["last_error"] = None
    entry["extractor"] = {
        "name": EXTRACTOR_NAME,
        "model": MODEL_NAME,
        "prompt_version": PROMPT_VERSION,
        "extractor_version": EXTRACTOR_VERSION,
    }
    manifest["articles"][article["id"]] = entry


def mark_article_failed(manifest: dict, article: dict, reason: str, error: str | None = None) -> None:
    entry = build_manifest_entry(article, manifest["articles"].get(article["id"]))
    entry["status"] = "failed"
    entry["reason"] = reason
    entry["last_error"] = error
    manifest["articles"][article["id"]] = entry


def active_article_entries(manifest: dict) -> dict[str, dict]:
    return {
        article_id: entry
        for article_id, entry in manifest.get("articles", {}).items()
        if entry.get("status") != "removed"
    }


def ready_article_ids(manifest: dict) -> list[str]:
    return sorted(
        article_id
        for article_id, entry in active_article_entries(manifest).items()
        if entry.get("status") == "ready" and extracted_artifact_path(article_id).exists()
    )


def missing_article_ids(manifest: dict) -> list[str]:
    return sorted(
        article_id
        for article_id, entry in active_article_entries(manifest).items()
        if entry.get("status") != "ready" or not extracted_artifact_path(article_id).exists()
    )
