#!/usr/bin/env python3
"""
Import new 葬AI Substack posts into the configured local article corpus.

The script reads the canonical source URLs from pipeline.toml's
[article_source] table and writes markdown files into ARTICLE_SOURCE_DIR
from scripts.pipeline_state. If ARTICLE_SOURCE_DIR differs from the repo
articles/ directory, the repo mirror is refreshed after import.
"""
from __future__ import annotations

import argparse
import json
import re
import fcntl
import os
import subprocess
import unicodedata
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from pipeline_state import ARTICLE_SOURCE_DIR, ARTICLES_DIR, _PIPELINE_CONFIG, ensure_article_mirror

CONTENT_NS = "{http://purl.org/rss/1.0/modules/content/}encoded"
FILENAME_RE = re.compile(r"^(?P<id>\d{3})_(?P<date>\d{4}-\d{2}-\d{2})_(?P<author>[^_]+)_(?P<title>.+)\.md$")
DATE_LINE_RE = re.compile(r"^(\d{4}年\d{1,2}月\d{1,2}日)\s+(.+?)\s+葬AI\s*$")
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ZangAIArticleImporter/1.0)",
}


@dataclass
class ExistingArticle:
    article_id: int
    date: str
    author: str
    title: str
    path: Path


@dataclass
class SubstackPost:
    title: str
    author: str
    date: str
    url: str
    body_markdown: str


class SimpleHtmlToMarkdown(HTMLParser):
    """Small HTML-to-Markdown converter tuned for Substack article bodies."""

    block_tags = {
        "article",
        "blockquote",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "ol",
        "p",
        "section",
        "ul",
    }
    skip_tags = {
        "button",
        "figcaption",
        "figure",
        "form",
        "iframe",
        "img",
        "noscript",
        "picture",
        "script",
        "source",
        "style",
        "svg",
    }
    void_tags = {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0
        self.heading_stack: list[str] = []
        self.list_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if self.skip_depth:
            if tag not in self.void_tags:
                self.skip_depth += 1
            return
        if tag in self.skip_tags:
            if tag not in self.void_tags:
                self.skip_depth = 1
            return
        if tag == "br":
            self.parts.append("\n")
            return
        if tag in {"ul", "ol"}:
            self.list_depth += 1
        if tag in self.block_tags:
            self._blank_line()
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.heading_stack.append(tag)
        elif tag == "li":
            self.parts.append("- ")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if self.skip_depth or tag in self.skip_tags:
            return
        if tag == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if tag in {"ul", "ol"} and self.list_depth:
            self.list_depth -= 1
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"} and self.heading_stack:
            self.heading_stack.pop()
        if tag in self.block_tags:
            self._blank_line()

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        text = unescape(data)
        if not text:
            return
        text = re.sub(r"[ \t\r\f\v]+", " ", text)
        if not text.strip():
            if self.parts and not self.parts[-1].endswith((" ", "\n")):
                self.parts.append(" ")
            return
        self.parts.append(text)

    def _blank_line(self) -> None:
        current = "".join(self.parts)
        if not current:
            return
        if current.endswith("\n\n"):
            return
        if current.endswith("\n"):
            self.parts.append("\n")
        else:
            self.parts.append("\n\n")

    def markdown(self) -> str:
        text = "".join(self.parts)
        text = text.replace("\xa0", " ")
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        lines = [line.strip() for line in text.splitlines()]
        return "\n".join(lines).strip()


_ego_task_id: int | None = None


def ego_script(script: str) -> str:
    result = subprocess.run(
        ["bash", "-c", "ego-browser nodejs <<'EGO_IMPORT'\n" + script + "\nEGO_IMPORT"],
        capture_output=True, text=True, timeout=90, check=True,
    )
    return result.stdout


def fetch_text(url: str) -> str:
    """Bounded HTTP retries, then the supported Ego Lite session for challenges."""
    global _ego_task_id
    request = urllib.request.Request(url, headers=REQUEST_HEADERS)
    last_error = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return response.read().decode(response.headers.get_content_charset() or "utf-8")
        except (OSError, urllib.error.URLError) as error:
            last_error = error
            if isinstance(error, urllib.error.HTTPError):
                if error.code not in {403, 408, 429, 500, 502, 503, 504}:
                    raise
                if error.code == 403:
                    break
            if attempt == 0:
                time.sleep(1)
    print(f"HTTP fetch failed; trying Ego Lite: {url} ({last_error})", file=sys.stderr)
    task = json.dumps(_ego_task_id or f"葬AI文章导入-{os.getpid()}")
    script = (
        f"const task = await useOrCreateTaskSpace({task});\n"
        "cliLog('EGO_TASK:' + task.id);\n"
        f"await openOrReuseTab({json.dumps(_PIPELINE_CONFIG['article_source']['base_url'])}, {{wait:true, timeout:20}});\n"
        f"const text = await browserFetch({json.dumps(url)});\n"
        "cliLog('EGO_BODY:' + JSON.stringify(text));"
    )
    try:
        output = ego_script(script)
        for line in output.splitlines():
            if line.startswith("EGO_TASK:"):
                _ego_task_id = int(line.removeprefix("EGO_TASK:"))
            if line.startswith("EGO_BODY:"):
                body = json.loads(line.removeprefix("EGO_BODY:"))
                if isinstance(body, str) and body and "Just a moment..." not in body[:1000]:
                    return body
        raise ValueError("Ego Lite did not return a usable response")
    except (OSError, subprocess.SubprocessError, ValueError) as error:
        raise RuntimeError(f"Could not fetch {url}: HTTP {last_error}; Ego Lite {error}") from error


def close_ego_task() -> None:
    global _ego_task_id
    if _ego_task_id is not None:
        ego_script(f"cliLog(await completeTaskSpace({_ego_task_id}, {{keep:false}}));")
        _ego_task_id = None


def title_key(title: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", title))


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


def normalize_author(author: str) -> str:
    author = author.strip()
    if author == "葬愛咸鱼":
        return "葬爱咸鱼"
    return author


def safe_filename_part(value: str) -> str:
    value = value.strip().replace("/", "／").replace(":", "：")
    value = re.sub(r"\s+", " ", value)
    return value


def display_date(date_str: str) -> str:
    parsed = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{parsed.year}年{parsed.month}月{parsed.day}日"


def post_date_from_iso(value: str) -> str:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed.astimezone(timezone.utc).date().isoformat()


def parse_existing_articles(source_dir: Path) -> list[ExistingArticle]:
    articles: list[ExistingArticle] = []
    for path in sorted(source_dir.glob("*.md")):
        match = FILENAME_RE.match(path.name)
        if not match:
            continue
        articles.append(
            ExistingArticle(
                article_id=int(match.group("id")),
                date=match.group("date"),
                author=match.group("author"),
                title=match.group("title"),
                path=path,
            )
        )
    return articles


def parse_archive_posts(archive_url: str) -> list[dict]:
    payload = json.loads(fetch_text(archive_url))
    if not isinstance(payload, list):
        raise ValueError("Substack archive API returned a non-list payload")
    return payload


def parse_feed_posts(feed_url: str) -> dict[str, str]:
    root = ET.fromstring(fetch_text(feed_url))
    content_by_url: dict[str, str] = {}
    content_by_title: dict[str, str] = {}
    for item in root.findall("./channel/item"):
        title = (item.findtext("title") or "").strip()
        link = normalize_url(item.findtext("link") or "")
        body_html = item.findtext(CONTENT_NS) or ""
        if not body_html:
            continue
        body_markdown = html_to_markdown(body_html)
        if link:
            content_by_url[link] = body_markdown
        if title:
            content_by_title[title] = body_markdown
    content_by_url.update({f"title:{title}": body for title, body in content_by_title.items()})
    return content_by_url


def html_to_markdown(body_html: str) -> str:
    parser = SimpleHtmlToMarkdown()
    parser.feed(body_html)
    parser.close()
    body = parser.markdown()
    body = "\n".join(
        line for line in body.splitlines()
        if not line.strip().startswith("Listen to this episode")
    ).strip()
    return body


def archive_author(post: dict) -> str:
    bylines = post.get("publishedBylines") or []
    if bylines and isinstance(bylines[0], dict):
        return normalize_author(str(bylines[0].get("name") or ""))
    return normalize_author(str(post.get("author") or ""))


def archive_to_post(post: dict, feed_content: dict[str, str]) -> SubstackPost:
    title = str(post["title"]).strip()
    url = normalize_url(str(post.get("canonical_url") or ""))
    body = feed_content.get(url) or feed_content.get(f"title:{title}") or ""
    if not body:
        # RSS has a short window. Recover older posts from their public post API.
        parts = urlsplit(url)
        post_url = urlunsplit((parts.scheme, parts.netloc, "/api/v1/posts/" + parts.path.rsplit("/", 1)[-1], "", ""))
        payload = json.loads(fetch_text(post_url))
        body = html_to_markdown(payload.get("body_html") or "")
        if not body:
            raise ValueError(f"Missing public article body for {title}: {url}")
    return SubstackPost(
        title=title,
        author=archive_author(post),
        date=post_date_from_iso(str(post["post_date"])),
        url=url,
        body_markdown=body,
    )


def render_article(article_id: int, post: SubstackPost) -> tuple[str, str]:
    filename = (
        f"{article_id:03d}_{post.date}_{safe_filename_part(post.author)}_"
        f"{safe_filename_part(post.title)}.md"
    )
    content = (
        f"# {post.title}\n\n"
        f"{display_date(post.date)} {post.author} 葬AI\n\n"
        "---\n\n"
        f"{post.body_markdown.strip()}\n"
    )
    return filename, content


def rewrite_author(article: ExistingArticle, author: str, *, dry_run: bool) -> Path:
    if article.author == author:
        return article.path

    new_name = (
        f"{article.article_id:03d}_{article.date}_{safe_filename_part(author)}_"
        f"{safe_filename_part(article.title)}.md"
    )
    new_path = article.path.with_name(new_name)
    if new_path.exists() and new_path != article.path:
        raise FileExistsError(f"Cannot rename {article.path.name}; {new_path.name} already exists")

    text = article.path.read_text(encoding="utf-8")
    lines = text.splitlines()
    for index, line in enumerate(lines[:12]):
        if DATE_LINE_RE.match(line):
            lines[index] = DATE_LINE_RE.sub(rf"\1 {author} 葬AI", line)
            break
    else:
        for index, line in enumerate(lines[:12]):
            if article.author in line and "葬AI" in line:
                lines[index] = line.replace(article.author, author, 1)
                break

    print(f"SYNC AUTHOR {article.path.name} -> {new_name}")
    if dry_run:
        return new_path

    article.path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    article.path.rename(new_path)
    return new_path


def import_posts(
    *,
    source_dir: Path,
    dry_run: bool,
    limit: int | None,
    sync_authors: bool,
) -> list[Path]:
    if not source_dir.exists():
        raise FileNotFoundError(f"Article source directory does not exist: {source_dir}")

    article_source = _PIPELINE_CONFIG.get("article_source", {})
    archive_url = article_source.get("archive_api_url")
    feed_url = article_source.get("feed_url")
    if not archive_url or not feed_url:
        raise ValueError("pipeline.toml must define [article_source].archive_api_url and feed_url")

    existing = parse_existing_articles(source_dir)
    existing_by_title = {title_key(article.title): article for article in existing}
    max_id = max((article.article_id for article in existing), default=0)

    new_archive_posts: list[dict] = []
    seen = set(existing_by_title)
    offset = 0
    while True:
        parts = urlsplit(str(archive_url))
        query = dict(parse_qsl(parts.query))
        query.update(offset=str(offset), limit="20")
        posts = parse_archive_posts(urlunsplit((*parts[:3], urlencode(query), parts.fragment)))
        if not posts:
            break
        reached_existing = False
        for post in posts:
            title = str(post.get("title") or "").strip()
            key = title_key(title)
            if not key:
                continue
            existing_article = existing_by_title.get(key)
            if existing_article:
                reached_existing = True
                # Author correction is opt-in; never rename the user's corpus by default.
                if sync_authors:
                    rewrite_author(existing_article, archive_author(post), dry_run=dry_run)
            elif key not in seen:
                new_archive_posts.append(post)
            seen.add(key)
        if reached_existing or len(posts) < 20:
            break
        offset += len(posts)

    new_archive_posts.sort(key=lambda post: post["post_date"])
    if limit is not None:
        new_archive_posts = new_archive_posts[:limit]
    feed_content = parse_feed_posts(str(feed_url)) if new_archive_posts else {}

    imported: list[Path] = []
    next_id = max_id + 1
    for post in new_archive_posts:
        substack_post = archive_to_post(post, feed_content)
        filename, content = render_article(next_id, substack_post)
        output_path = source_dir / filename
        if output_path.exists():
            raise FileExistsError(f"Refusing to overwrite existing article: {output_path}")

        print(f"IMPORT {substack_post.url} -> {output_path.name}")
        if not dry_run:
            output_path.write_text(content, encoding="utf-8")
        imported.append(output_path)
        next_id += 1

    if not imported:
        print("No new Substack posts found.")
    return imported


def mirror_source_to_repo(source_dir: Path) -> None:
    # One implementation owns corpus mirroring.
    import pipeline_state
    previous = pipeline_state.ARTICLE_SOURCE_DIR
    try:
        pipeline_state.ARTICLE_SOURCE_DIR = source_dir
        ensure_article_mirror()
    finally:
        pipeline_state.ARTICLE_SOURCE_DIR = previous


def main() -> int:
    parser = argparse.ArgumentParser(description="Import new 葬AI Substack posts.")
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=ARTICLE_SOURCE_DIR,
        help="Markdown article corpus to update; defaults to pipeline article source_dir.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing files.")
    parser.add_argument("--limit", type=int, help="Maximum number of newest posts to import.")
    parser.add_argument("--sync-authors", action="store_true", help="Opt in to correcting existing author filenames.")
    parser.add_argument("--no-sync-authors", action="store_true", help="Do not update authors for existing posts.")
    parser.add_argument("--no-mirror", action="store_true", help="Do not refresh repo articles/ from source_dir after import.")
    args = parser.parse_args()

    # Lock the corpus directory itself: no persistent lock files, no duplicate IDs
    # when a manual run and the scheduled run overlap.
    source_dir = args.source_dir.expanduser()
    descriptor = os.open(source_dir, os.O_RDONLY)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        imported = import_posts(
            source_dir=source_dir, dry_run=args.dry_run, limit=args.limit,
            sync_authors=args.sync_authors and not args.no_sync_authors,
        )
        if not args.dry_run and not args.no_mirror:
            mirror_source_to_repo(source_dir)
    finally:
        os.close(descriptor)
        close_ego_task()

    print(f"Imported: {len(imported)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
