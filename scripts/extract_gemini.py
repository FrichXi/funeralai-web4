"""
葬AI宇宙 — Gemini 增量实体提取脚本

主流程：
1. 扫描 `articles/` 并同步 `data/state/articles_manifest.json`
2. 仅提取新增/变更/失效文章
3. 每篇文章落一个标准化中间产物到 `data/extracted/{article_id}.json`
4. 当全部活跃文章都 ready 时，聚合导出到：
   - `data/graph/canonical_full.json`
   - `data/graph/canonical.json`

常用命令：
  python scripts/extract_gemini.py
  python scripts/extract_gemini.py --limit 3 --workers 1
  python scripts/extract_gemini.py --articles 001 002
  python scripts/extract_gemini.py --force
  python scripts/extract_gemini.py --articles 001 002 003 --force --allow-partial-export
"""

import argparse
import asyncio
import itertools
import os
import sys
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    load_dotenv = None

from graph_builder import build_graph_bundle_from_manifest, export_graphs, normalize_article_extraction
from pipeline_state import (
    EXTRACTOR_VERSION,
    MODEL_NAME,
    PROJECT_ROOT,
    PROMPT_VERSION,
    ensure_pipeline_dirs,
    extracted_artifact_path,
    extraction_decision,
    load_articles,
    load_manifest,
    mark_article_failed,
    mark_article_pending,
    mark_article_ready,
    raw_debug_path,
    raw_result_path,
    save_json_file,
    save_manifest,
    sync_manifest,
)


def load_project_env(path: Path) -> None:
    if load_dotenv is not None:
        load_dotenv(path)
        return
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


load_project_env(PROJECT_ROOT / ".env")

SYSTEM_PROMPT = """你是一个严谨的知识图谱抽取助手。你的任务是从中文 AI 行业评论文章中抽取具体实体和实体关系，并输出严格 JSON。"""

EXTRACTION_PROMPT = """【项目目标】
我要构建的是“AI 行业实体网络”，核心节点只保留具体实体，不做概念图。

【只允许输出这 4 类实体】
- company：公司、机构（非投资机构）
- person：创始人、CEO、投资人、关键行业人物
- product：具体产品、工具、应用、服务
- vc_firm：风投基金、投资机构、资本（如 a16z、红杉资本、IDG、高瓴、五源资本）

【不要输出为实体节点】
- 抽象概念、行业趋势、方法论、商业模式
- 大模型版本名或产品版本名（如 Gemini 2.5 Pro、Claude Sonnet 4、Seedance 2.0）
- 通用角色词、泛称、文章写作过程信息
- 文章作者、公众号来源、发布平台、原文链接、配图/辅助写作鸣谢
- 只在背景里顺嘴提到的媒体、平台、办公工具、引用来源
- 键盘、打字机等通用物件，或历史发明/历史人物等与 AI 行业实体网络无关的对象

【概念如何处理】
- 如果某个概念对理解实体有帮助，可以放进实体的 tags 数组
- tags 只能是简短主题词，不能替代实体节点

【关系类型只能用以下枚举】
- founder_of        (person→company)
- co_founded        (person↔person，联合创始人关系)
- works_at          (person→company，任职关系)
- works_on          (person→product)
- develops          (company→product，公司开发产品)
- invests_in        (person/company/vc_firm→company)
- competes_with     (同类实体之间)
- compares_to       (同类实体之间)
- criticizes        (person→any，批评)
- praises           (person→any，赞扬)
- partners_with     (company↔company)
- acquires          (company→company)
- mentors           (person→person，师徒/指导关系)
- collaborates_with (person↔person，合作/同事关系)
- integrates_with   (product↔product，产品集成/依赖)
- related           (兜底)

【跨类型关系要求】
请务必覆盖以下六种实体组合的关系，不要只抽公司-产品或产品-产品：
- person ↔ person：联合创始、同事、师徒、互相批评/赞扬、共同投资
- person ↔ company：创始人、任职、投资、批评/赞扬
- person ↔ product：开发、使用、批评/赞扬
- company ↔ company：竞争、合作、投资、收购
- company ↔ product：开发、拥有、竞品
- product ↔ product：竞争、对比、集成/依赖

【抽取原则】
- 优先抽文章真正讨论的对象，而不是顺嘴提到的背景词
- 创始人、公司、产品尽量连成链路
- 同一实体统一命名：中文名优先；英文产品名保持原文
- 如果关系不够明确，就不要硬造
- 如果正文没有足够明确的具体实体，可以返回空数组，不要为了凑图硬抽
- 人物之间的关系和公司/产品之间的关系同等重要，不要忽略
- 每个关系请标注置信度：high=文章明确陈述；medium=可合理推断；low=仅间接提及
- 文章标题中明确提到的实体必须提取，即使正文只简略提及
- 文章核心论述的"A 像/抄/平替 B"比较关系是高优先级关系，务必提取
- 文中出现"XX在抄XX"、"XX是XX的平替"、"XX就是XX界的YY"等表述时，提取 compares_to 或 competes_with 关系
- 人物被用作比喻对象（如"A就是B界的峰哥"）时，该人物作为 person 实体提取，关系为 compares_to
- 基金/机构投资了某人的项目时，除了"基金→产品(invests_in)"，还要提取"基金→人物(invests_in)"的直接关系

【容易遗漏的关系——请特别注意】
1. 创始人关系：如果文中描述某人”创立/创办/联合创立”了某公司，必须提取 founder_of
   - 例：文中出现”闫俊杰创立了MiniMax” → 闫俊杰 --founder_of--> MiniMax
2. 收购链推导：如果 A 被 B 收购，则 A 的创始人与 B 有 works_at 关系
   - 例：”脸萌被字节跳动收购” + “郭列是脸萌创始人” → 郭列 --works_at--> 字节跳动
3. 产品归属：如果产品 X 是公司 Y 的，提取 Y --develops--> X
   - 例：”火山引擎是字节跳动的云平台” → 字节跳动 --develops--> 火山引擎
4. 集体昵称/比较：如果文章用昵称指代多个实体的关系，提取实际关系
   - 例：”砸盘两兄弟”指 MiniMax 和智谱AI → MiniMax --compares_to--> 智谱AI
5. works_on vs works_at vs founder_of 区分：
   - founder_of: 创始人→公司（仅创始人关系）
   - works_at: 员工/高管→公司（任职关系）
   - works_on: 人→产品（参与开发产品，非任职于产品）
   - 注意：如果人”在某产品团队工作”，应提取 works_at 指向该产品的母公司
6. 投资关系：vc_firm/公司 投资了 → invests_in，不要用 mentors

【输入说明】
- 我提供的是”标题 + 正文”，已经去掉作者/来源/原文链接等元信息
- 不要根据文章结尾的工具鸣谢、配图说明去抽实体或关系

【输出格式】
严格输出 JSON，不要附加任何说明文字：
```json
{
  "entities": [
    {
      "name": "实体名",
      "type": "company|person|product|vc_firm",
      "description": "一句话描述",
      "aliases": ["可选别名"],
      "tags": ["可选标签"]
    }
  ],
  "relationships": [
    {
      "source": "实体A",
      "target": "实体B",
      "type": "founder_of|co_founded|works_at|works_on|develops|invests_in|competes_with|compares_to|criticizes|praises|partners_with|acquires|mentors|collaborates_with|integrates_with|related",
      "description": "关系说明",
      "confidence": "high|medium|low"
    }
  ]
}
```

【文章正文】
"""


# Multi-key round-robin: set GEMINI_API_KEYS=key1,key2,key3 in .env (comma-separated)
# Falls back to single GEMINI_API_KEY for backwards compatibility
def _init_api_keys():
    # Support both GEMINI_API_KEYS and GEMINI_API_KEY (comma-separated or single)
    raw = os.environ.get("GEMINI_API_KEYS", "") or os.environ.get("GEMINI_API_KEY", "")
    keys = [k.strip() for k in raw.split(",") if k.strip()]
    return keys

_API_KEYS: list[str] = []
_KEY_CYCLE = None

def _next_api_key() -> str:
    global _API_KEYS, _KEY_CYCLE
    if not _API_KEYS:
        _API_KEYS = _init_api_keys()
        _KEY_CYCLE = itertools.cycle(_API_KEYS)
    return next(_KEY_CYCLE)


async def call_gemini(prompt: str, system_prompt: str | None = None, max_retries: int = 6):
    import httpx

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 65536},
    }
    if system_prompt:
        body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    for attempt in range(max_retries):
        api_key = _next_api_key()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=120, proxy=proxy) as client:
                resp = await client.post(url, json=body)

                if resp.status_code == 429:
                    wait = min(2 ** attempt * 3, 60)
                    print(f"      429 rate limit, wait {wait}s...", flush=True)
                    await asyncio.sleep(wait)
                    continue

                if resp.status_code == 400:
                    err = resp.text[:200]
                    print(f"      400 error: {err}", flush=True)
                    if "location" in err.lower():
                        await asyncio.sleep(5)
                        continue
                    return None

                resp.raise_for_status()
                data = resp.json()
                if not data.get("candidates"):
                    return None
                return data["candidates"][0]["content"]["parts"][0]["text"]

        except Exception as exc:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            print(f"      Error after {max_retries} attempts: {exc}", flush=True)
            return None

    return None


def parse_json_response(text: str | None):
    if not text:
        return None
    candidate = text
    if "```json" in candidate:
        candidate = candidate.split("```json", 1)[1]
    if "```" in candidate:
        candidate = candidate.split("```", 1)[0]
    candidate = candidate.strip()

    import json

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(candidate[start:end])
            except json.JSONDecodeError:
                return None
    return None


async def extract_one(article: dict, semaphore: asyncio.Semaphore):
    async with semaphore:
        print(f"  [{article['id']}] {article['title'][:30]}...", flush=True)
        prompt = EXTRACTION_PROMPT + article["prompt_text"]
        raw_text = await call_gemini(prompt, system_prompt=SYSTEM_PROMPT)
        parsed = parse_json_response(raw_text)

        if not parsed:
            if raw_text:
                raw_debug_path(article["id"]).write_text(raw_text, encoding="utf-8")
            return None, "parse_failed"

        raw_payload = {
            **parsed,
            "_article_id": article["id"],
            "_article_title": article["title"],
            "_model": MODEL_NAME,
            "_prompt_version": PROMPT_VERSION,
            "_extractor_version": EXTRACTOR_VERSION,
        }
        save_json_file(raw_result_path(article["id"]), raw_payload)

        artifact = normalize_article_extraction(article, parsed)
        save_json_file(extracted_artifact_path(article["id"]), artifact)
        return artifact, None


def select_articles(all_articles: list[dict], article_ids: list[str] | None, limit: int | None) -> list[dict]:
    selected = all_articles
    if article_ids:
        chosen = set(article_ids)
        selected = [article for article in all_articles if article["id"] in chosen]
    if limit is not None:
        selected = selected[:limit]
    return selected


async def main_async(args):
    ensure_pipeline_dirs()

    all_articles = load_articles()
    selected_articles = select_articles(all_articles, args.articles, args.limit)
    if not selected_articles:
        print("No matching articles found.")
        return 1

    manifest = sync_manifest(load_manifest(), all_articles)

    targets = []
    skipped = []
    for article in selected_articles:
        entry = manifest["articles"].get(article["id"])
        should_extract, reason = extraction_decision(article, entry, force=args.force)
        if should_extract:
            mark_article_pending(manifest, article, reason)
            targets.append((article, reason))
        else:
            mark_article_ready(manifest, article, "up_to_date")
            skipped.append(article["id"])

    save_manifest(manifest)

    print(f"Articles in repo: {len(all_articles)}")
    print(f"Selected for this run: {len(selected_articles)}")
    print(f"Need extraction: {len(targets)}")
    print(f"Skipped as up-to-date: {len(skipped)}")

    semaphore = asyncio.Semaphore(args.workers)
    started = time.time()
    success_count = 0

    if targets:
        tasks = [extract_one(article, semaphore) for article, _reason in targets]
        results = await asyncio.gather(*tasks)
        for (article, reason), (artifact, error_reason) in zip(targets, results, strict=False):
            if artifact:
                mark_article_ready(manifest, article, reason)
                success_count += 1
                print(
                    f"  [{article['id']}] OK: {len(artifact['entities'])} entities, {len(artifact['relationships'])} rels",
                    flush=True,
                )
            else:
                mark_article_failed(manifest, article, error_reason or reason, error_reason)
                print(f"  [{article['id']}] FAILED: {error_reason}", flush=True)

    elapsed = time.time() - started
    save_manifest(manifest)
    print(f"\nExtraction stage finished in {elapsed:.1f}s")
    print(f"Newly extracted this run: {success_count}")

    full_graph, canonical_graph, summary = build_graph_bundle_from_manifest(
        manifest,
        allow_partial=args.allow_partial_export,
    )
    if full_graph is None or canonical_graph is None:
        print("\nGraph export skipped: not all active articles are ready yet.")
        print(f"Ready articles: {summary['ready_count']}")
        print(f"Missing articles: {summary['missing_count']}")
        if summary["missing_article_ids"]:
            print("First missing IDs:", ", ".join(summary["missing_article_ids"][:10]))
        return 0

    export_graphs(full_graph, canonical_graph)
    print(
        "\nGraph exported: "
        f"{len(full_graph['nodes'])} full nodes / {len(full_graph['links'])} full links / "
        f"{len(canonical_graph['nodes'])} canonical nodes / {len(canonical_graph['links'])} canonical links"
    )

    if canonical_graph["metadata"].get("isPartial"):
        print("Exported partial graph because --allow-partial-export was enabled.")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Incrementally extract article entities with Gemini")
    parser.add_argument("--limit", type=int, help="Only process the first N selected articles")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent Gemini requests")
    parser.add_argument("--articles", nargs="+", help="Specific article IDs to process, e.g. 001 002 010")
    parser.add_argument("--force", action="store_true", help="Re-extract even if manifest says the article is up to date")
    parser.add_argument("--allow-partial-export", action="store_true", help="Allow graph export even if some articles are still pending")
    args = parser.parse_args()

    if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("GEMINI_API_KEYS"):
        print("ERROR: Set GEMINI_API_KEY or GEMINI_API_KEYS (comma-separated) in .env")
        sys.exit(1)
    keys = _init_api_keys()
    print(f"Using {len(keys)} API key(s)")

    sys.exit(asyncio.run(main_async(args)))


if __name__ == "__main__":
    main()
