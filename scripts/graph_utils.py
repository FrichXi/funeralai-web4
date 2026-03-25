"""
graph_utils.py -- Entity and relationship normalization utilities.

Provides the core normalization layer for the extraction pipeline:
  - Entity name canonicalization (MERGE_MAP, MERGE_INDEX)
  - Entity type resolution (TYPE_OVERRIDES, TYPE_ALIASES)
  - Blacklist filtering (EXACT_BLACKLIST, concept/role patterns)
  - Relationship type normalization (RELATION_ALIASES, RELATION_STRENGTH)
  - Mention counting across article texts

All other pipeline scripts import from this module.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

from pipeline_state import ARTICLES_DIR, ensure_article_mirror

ALLOWED_ENTITY_TYPES = ("company", "product", "person", "vc_firm")

TYPE_ALIASES = {
    "company": "company",
    "organization": "company",
    "org": "company",
    "创业公司": "company",
    "大公司": "company",
    "公司": "company",
    "机构": "company",
    "投资机构": "vc_firm",
    "vc": "vc_firm",
    "fund": "vc_firm",
    "基金": "vc_firm",
    "资本": "vc_firm",
    "venture capital": "vc_firm",
    "investment firm": "vc_firm",
    "product": "product",
    "artifact": "product",
    "technology": "product",
    "tool": "product",
    "app": "product",
    "service": "product",
    "platform": "product",
    "ai产品": "product",
    "产品": "product",
    "工具": "product",
    "应用": "product",
    "服务": "product",
    "平台": "product",
    "person": "person",
    "people": "person",
    "人物": "person",
    "创业者": "person",
    "创始人": "person",
    "ceo": "person",
    "founder": "person",
    "投资人": "person",
}

TYPE_OVERRIDES = {
    "ChatGPT": "product",
    "Claude": "product",
    "Gemini": "product",
    "Kimi": "product",
    "YouWare": "product",
    "Manus": "product",
    "Cursor": "product",
    "Flowith": "product",
    "Flowith OS": "product",
    "YouMind": "product",
    "MyShell": "product",
    "扣子": "product",
    "豆包": "product",
    "剪映": "product",
    "陪我APP": "product",
    "Looki": "product",
    "Plaud": "product",
    "Product Hunt": "company",
    "Google": "company",
    "OpenAI": "company",
    "Meta": "company",
    "字节跳动": "company",
    "月之暗面": "company",
    "智谱AI": "company",
    "百川智能": "company",
    "零一万物": "company",
    "阶跃星辰": "company",
    "MiniMax": "company",
    "DeepSeek": "company",
    "36氪": "company",
    "a16z": "vc_firm",
    "IDG": "vc_firm",
    "红杉资本": "vc_firm",
    "高瓴": "vc_firm",
    "锦秋基金": "vc_firm",
    "五源": "vc_firm",
    "金沙江": "vc_firm",
    "Benchmark": "vc_firm",
    "经纬创投": "vc_firm",
    "真格基金": "vc_firm",
    "Rokid": "product",
    "Agnes": "product",
    "葬爱咸鱼": "person",
    "明超平": "person",
    "杨植麟": "person",
    "王小川": "person",
    "李开复": "person",
    "张一鸣": "person",
    "孙宇晨": "person",
    "扎克伯格": "person",
    "马斯克": "person",
}

MERGE_MAP = {
    "葬爱咸鱼": ["Zanai Xianyu", "Zang Ai Xianyu", "葬愛咸鱼", "咸鱼", "Xianyu"],
    "杨植麟": ["杨圣", "Yang Zhilin"],
    "王小川": ["Wang Xiaochuan"],
    "李开复": ["Li Kaifu", "Li Kai-Fu"],
    "明超平": ["Ming Chaoping", "小明"],
    "张一鸣": ["Zhang Yiming"],
    "孙宇晨": ["Sun Yuchen", "Sun Ge Yuchen"],
    "扎克伯格": ["Zuckerberg", "Mark Zuckerberg"],
    "马斯克": ["Elon Musk", "Musk"],
    "阿里巴巴": ["Alibaba", "阿里"],
    "字节跳动": ["ByteDance", "字节", "Bytedance"],
    "月之暗面": ["Moonshot AI", "Moonshot"],
    "智谱AI": ["智谱", "Zhipu", "Zhipu AI", "智谱清言"],
    "百川智能": ["Baichuan", "百川", "Baichuan Intelligence"],
    "阶跃星辰": ["Step Fun", "StepFun", "阶跃"],
    "零一万物": ["01.AI", "01 AI"],
    "MiniMax": ["Minimax", "minimax"],
    "DeepSeek": ["Deepseek", "deepseek"],
    "MyShell": ["My Shell", "Myshell"],
    "马卡龙": ["Macaron", "macaron"],
    "Google": ["google", "Google AI"],
    "OpenAI": ["openai"],
    "Meta": ["meta", "Facebook"],
    "a16z": ["A16z", "A16Z"],
    "IDG": ["IDG 90后基金"],
    "红杉资本": ["红杉"],
    "微信": ["WeChat", "Wechat"],
    "抖音": ["TikTok", "Douyin"],
    "知乎": ["Zhihu"],
    "淘宝": ["Taobao"],
    "36氪": ["36Kr"],
    "Kimi": ["kimi"],
    "扣子": ["Coze", "扣子/Coze"],
    "豆包": ["Doubao"],
    "剪映": ["Jianying", "CapCut"],
    "YouWare": ["youware", "You Ware", "Youware"],
    "Product Hunt": ["product-hunt", "ProductHunt"],
    "陪我APP": ["陪我app", "陪我 App"],
    "ChatGPT": ["chatgpt", "ChatGPT o3", "ChatGPT O3", "GPT-o3", "GPT O3", "GPT-4", "GPT-4o"],
    "Claude": ["claude", "Claude Sonnet 4", "Claude Sonnet", "Claude Code"],
    "Gemini": ["gemini", "Gemini 2.5 Pro", "Gemini 2.5", "Gemini 2.0", "Gemini 1.5 Pro"],
    "Qwen": ["Qwen 3", "Qwen", "千问", "通义大模型", "通义"],
    "GenSpark": ["Genspark", "genspark"],
    "MuleRun": ["Mulerun", "mulerun", "电骡"],
    "OpenClaw": ["Openclaw", "openclaw"],
    "Cherry Studio": ["Cherry studio", "cherry studio"],
    "Cowork": ["cowork"],
    "Flowith": ["flowith"],
    "Plaud": ["plaud", "PLAUD"],
    "Medeo": ["medeo"],
    "Rokid": ["rokid"],
    "商汤科技": ["商汤"],
    "千里科技": ["千里"],
    "火山引擎": ["火山"],
    "海螺AI": ["海螺"],
}

BORING_RELATION_TYPES = {
    "用户",
    "用户关系",
    "使用",
    "内容消费",
    "内容生成",
    "配图生成",
    "写作辅助",
    "辅助写作",
    "内容创作",
    "内容创造",
    "工具使用",
    "工具应用",
    "公众号运营",
    "内容发布",
    "平台运营",
}

RELATION_STRENGTH = {
    # Tier 1 (5): Definitive structural relationships
    "founder_of": 5,
    "co_founded": 5,
    "acquires": 5,
    # Tier 2 (4): Strong operational relationships
    "invests_in": 4,
    "works_at": 4,
    "develops": 4,
    # Tier 3 (3): Significant relationships
    "competes_with": 3,
    "partners_with": 3,
    "works_on": 3,
    "criticizes": 3,
    "praises": 3,
    "mentors": 3,
    # Tier 4 (2): Comparative/contextual
    "compares_to": 2,
    "collaborates_with": 2,
    "integrates_with": 2,
    # Tier 5 (1): Catch-all weak relationship
    "related": 1,
}

DEFAULT_RELATION_STRENGTH = 1


def relation_strength(relation_type: str) -> int:
    """Return the strength tier value for a relationship type."""
    return RELATION_STRENGTH.get(relation_type, DEFAULT_RELATION_STRENGTH)


RELATION_ALIASES = {
    "创始人": "founder_of",
    "创办": "founder_of",
    "创立": "founder_of",
    "founder": "founder_of",
    "开发": "works_on",
    "打造": "works_on",
    "推出": "works_on",
    "负责": "works_on",
    "develops": "works_on",
    "投资": "invests_in",
    "investment": "invests_in",
    "竞争": "competes_with",
    "批评": "criticizes",
    "赞扬": "praises",
    "对比": "compares_to",
    "对标": "compares_to",
    "合作": "partners_with",
    "收购": "acquires",
    "相关": "related",
    "related": "related",
    "联合创始": "co_founded",
    "共同创办": "co_founded",
    "co-founder": "co_founded",
    "co_founder": "co_founded",
    "任职": "works_at",
    "就职": "works_at",
    "加入": "works_at",
    "employed": "works_at",
    "works_at": "works_at",
    "开发产品": "develops",
    "研发": "develops",
    "推出产品": "develops",
    "develops": "develops",
    "指导": "mentors",
    "mentor": "mentors",
    "师徒": "mentors",
    "合作伙伴": "collaborates_with",
    "同事": "collaborates_with",
    "共事": "collaborates_with",
    "collaborates": "collaborates_with",
    "集成": "integrates_with",
    "依赖": "integrates_with",
    "接入": "integrates_with",
    "integrates": "integrates_with",
}

EXACT_BLACKLIST = {
    "AI",
    "AIGC",
    "AGI",
    "Agent",
    "AI Agent",
    "Personal Agent",
    "Agent Store",
    "Vibe Coding",
    "一句话生成",
    "一句话生成AI",
    "一句话生成AI产品",
    "AI创始人神性论",
    "创始人神性论",
    "AI创业神学体系",
    "AI创业生态",
    "AI六小虎",
    "AI Six Tigers",
    "Hangzhou Six Dragons",
    "杭州六小龙",
    "Web3",
    "Web2",
    "Blockchain",
    "Shell币",
    "USDT",
    "创作者经济",
    "币圈",
    "ARR",
    "积分",
    "流动性",
    "合成数据",
    "合成叙事",
    "版本管理",
    "编程式写作",
    "Voice Input",
    "语音输入",
    "键盘",
    "打字机",
    "QWERTY",
    "Newsletter",
    "公众号",
    "WeChat Article",
    "项目文件夹",
    "世界首个通用Agent",
    "下一代Agent平台",
    "AI项目",
    "作者",
    "投资人",
    "创业者",
    "创始人",
    "用户",
    "读者",
    "媒体",
    "AI自媒体",
    "VC",
    "KOL",
    "Friends",
    "Reader",
    "Founder",
    "User",
    "Users",
    "Article",
    "Draft",
    "Content",
    "本文",
    "葬AI",
    "葬愛咸鱼",
    "中国AI行业评论公众号「葬AI」",
}

GENERIC_ROLE_PATTERNS = (
    re.compile(r"^(?:ai)?(?:创业者|创始人|投资人|投资机构|创业公司|大公司|产品经理|作者|用户|读者|媒体|自媒体|团队)$", re.IGNORECASE),
    re.compile(r"^(?:person|people|company|product|tool|platform|service|content)$", re.IGNORECASE),
)

CONCEPT_PATTERNS = (
    re.compile(r"(?:理论|主义|模式|概念|体系|方法|趋势|生态|范式|能力|叙事|革命|自由|改革|困境|神学|武器库)$"),
    re.compile(r"^(?:模型|大模型|生成式AI|Large Language Model|Context Management|Information Interaction)$", re.IGNORECASE),
)

MODEL_VERSION_PATTERNS = (
    re.compile(r"\b(?:gemini|qwen|claude|gpt|chatgpt|deepseek|kimi|llama)\s*[- ]?\d+(?:\.\d+)*(?:\s*(?:pro|flash|preview|max|ultra|mini|turbo|sonnet|opus|haiku|lite))?\b", re.IGNORECASE),
    re.compile(r"\b(?:sonnet|opus|haiku)\s*\d+\b", re.IGNORECASE),
)

LATIN_TOKEN_RE = re.compile(r"[A-Za-z0-9]")
TAG_STOPWORDS = {
    "AI",
    "AIGC",
    "AGI",
    "作者",
    "用户",
    "读者",
    "媒体",
    "自媒体",
    "本文",
    "文章",
    "工具",
    "产品",
    "公司",
    "机构",
    "平台",
}


def sanitize_id(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", name.lower()).strip("-")


def build_merge_index(merge_map: dict[str, list[str]]) -> dict[str, str]:
    index: dict[str, str] = {}
    for canonical, aliases in merge_map.items():
        index[canonical.casefold()] = canonical
        for alias in aliases:
            index[alias.casefold()] = canonical
    return index


MERGE_INDEX = build_merge_index(MERGE_MAP)


_CASEFOLD_CACHE: dict[str, str] = {}


def canonicalize_name(name: str | None) -> str:
    raw = (name or "").strip()
    if not raw:
        return ""
    # 1. Exact match via MERGE_INDEX
    hit = MERGE_INDEX.get(raw.casefold())
    if hit:
        return hit
    # 2. Case-insensitive dedup: first occurrence wins
    key = raw.casefold()
    if key in _CASEFOLD_CACHE:
        return _CASEFOLD_CACHE[key]
    _CASEFOLD_CACHE[key] = raw
    return raw


def normalize_relation_type(value: object) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "related"
    return RELATION_ALIASES.get(raw.lower(), raw if raw in RELATION_ALIASES.values() else "related")


def normalize_entity_type(name: str, raw_type: str | None, description: str | None = None) -> str | None:
    if name in TYPE_OVERRIDES:
        return TYPE_OVERRIDES[name]

    raw = (raw_type or "").strip().lower()
    if raw in TYPE_ALIASES:
        return TYPE_ALIASES[raw]

    combined = f"{name} {description or ''}".lower()
    if any(token in combined for token in ("创始人", "ceo", "founder", "投资人")):
        return "person"
    if any(token in combined for token in ("公司", "机构", "capital", "fund", "studio", "lab")):
        return "company"
    if any(token in combined for token in ("产品", "工具", "应用", "app", "assistant", "platform", "service", "模型")):
        return "product"
    if any(token in name for token in ("公司", "资本", "基金", "集团")):
        return "company"
    if any(token in name for token in ("APP", "助手", "Studio", "OS")):
        return "product"
    return None


def is_model_version(name: str) -> bool:
    return any(pattern.search(name) for pattern in MODEL_VERSION_PATTERNS)


def is_blacklisted_name(name: str) -> bool:
    if not name:
        return True
    if name in EXACT_BLACKLIST:
        return True
    if any(item.casefold() == name.casefold() for item in EXACT_BLACKLIST):
        return True
    if any(pattern.match(name) for pattern in GENERIC_ROLE_PATTERNS):
        return True
    if any(pattern.search(name) for pattern in CONCEPT_PATTERNS):
        return True
    return False


def keep_entity(
    name: str,
    entity_type: str | None,
    description: str | None = None,
    raw_name: str | None = None,
) -> bool:
    if entity_type not in ALLOWED_ENTITY_TYPES:
        return False

    raw = (raw_name or name or "").strip()
    if not raw or len(raw) < 2:
        return False

    if is_blacklisted_name(name):
        return False

    # If a raw name is still a version string after canonicalization, keep it out.
    if canonicalize_name(raw) == raw and is_model_version(raw):
        return False

    desc = (description or "").strip()
    if desc and any(token in desc for token in ("概念", "趋势", "方法论", "商业模式", "理论")):
        return False

    return True


def normalize_tag(tag: object, entity_names: set[str] | None = None) -> str | None:
    cleaned = canonicalize_name(str(tag or "").strip())
    if not cleaned:
        return None
    if len(cleaned) < 2:
        return None
    if cleaned in TAG_STOPWORDS:
        return None
    if entity_names and cleaned in entity_names:
        return None
    if is_model_version(cleaned):
        return None
    if any(pattern.match(cleaned) for pattern in GENERIC_ROLE_PATTERNS):
        return None
    return cleaned


def normalize_entity(
    name: str | None,
    raw_type: str | None = None,
    description: str | None = None,
) -> tuple[str, str] | None:
    canonical_name = canonicalize_name(name)
    entity_type = normalize_entity_type(canonical_name, raw_type, description)
    if not keep_entity(canonical_name, entity_type, description, raw_name=name):
        return None
    return canonical_name, entity_type


def pick_best_description(descriptions: Iterable[str], max_len: int = 200) -> str:
    cleaned: list[str] = []
    seen = set()
    for description in descriptions:
        for part in (description or "").split("<SEP>"):
            text = part.strip()
            if not text or text in seen:
                continue
            seen.add(text)
            cleaned.append(text)

    if not cleaned:
        return ""

    best = max(cleaned, key=len)
    if len(best) > max_len:
        return best[:max_len] + "..."
    return best


def entity_variants(name: str) -> list[str]:
    variants = {name}
    aliases = MERGE_MAP.get(name, [])
    variants.update(alias for alias in aliases if alias)
    return sorted(variants, key=len, reverse=True)


def count_mentions_in_text(text: str, variants: Iterable[str]) -> int:
    spans: list[tuple[int, int]] = []
    casefolded = text.casefold()

    for variant in variants:
        needle = variant.strip()
        if not needle:
            continue

        if LATIN_TOKEN_RE.search(needle):
            pattern = re.compile(rf"(?<![A-Za-z0-9]){re.escape(needle)}(?![A-Za-z0-9])", re.IGNORECASE)
            spans.extend((match.start(), match.end()) for match in pattern.finditer(text))
            continue

        folded_needle = needle.casefold()
        start = 0
        while True:
            idx = casefolded.find(folded_needle, start)
            if idx < 0:
                break
            spans.append((idx, idx + len(folded_needle)))
            start = idx + len(folded_needle)

    spans.sort(key=lambda item: (item[0], -(item[1] - item[0])))
    accepted = 0
    last_end = -1
    for start, end in spans:
        if start < last_end:
            continue
        accepted += 1
        last_end = end
    return accepted


def load_article_texts(limit: int | None = None) -> dict[str, str]:
    ensure_article_mirror()
    articles: dict[str, str] = {}
    for filepath in sorted(ARTICLES_DIR.glob("*.md")):
        if filepath.name.startswith("00_"):
            continue
        article_id = filepath.stem.split("_", 1)[0]
        articles[article_id] = filepath.read_text(encoding="utf-8")
        if limit and len(articles) >= limit:
            break
    return articles


def compute_entity_metrics(
    entity_names: Iterable[str],
    article_texts: dict[str, str] | None = None,
) -> dict[str, dict[str, object]]:
    if article_texts is None:
        article_texts = load_article_texts()
    metrics: dict[str, dict[str, object]] = {}

    for name in entity_names:
        variants = entity_variants(name)
        article_ids: set[str] = set()
        mention_count = 0
        for article_id, text in article_texts.items():
            count = count_mentions_in_text(text, variants)
            if count > 0:
                article_ids.add(article_id)
                mention_count += count
        metrics[name] = {
            "article_ids": article_ids,
            "article_count": len(article_ids),
            "mention_count": mention_count,
        }

    return metrics


def resolve_link_name(value: object, id_to_name: dict[str, str]) -> str:
    if isinstance(value, dict):
        return canonicalize_name(value.get("name") or value.get("id"))
    text = str(value)
    return canonicalize_name(id_to_name.get(text, text))


def resolve_link_key(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("id") or value.get("name") or "")
    return str(value)


def normalize_graph_data(
    graph_data: dict,
    article_texts: dict[str, str] | None = None,
    metadata_source: str | None = None,
) -> dict:
    if article_texts is None:
        article_texts = load_article_texts()

    node_descriptions: dict[str, list[str]] = defaultdict(list)
    node_type_votes: dict[str, list[str]] = defaultdict(list)
    node_tags: dict[str, set[str]] = defaultdict(set)
    fallback_article_counts: Counter[str] = Counter()
    fallback_mention_counts: Counter[str] = Counter()
    node_input_order: list[str] = []
    id_to_name: dict[str, str] = {}
    concept_nodes: dict[str, str] = {}

    for node in graph_data.get("nodes", []):
        raw_name = node.get("name") or node.get("id")
        normalized = normalize_entity(raw_name, node.get("type"), node.get("description"))
        if not normalized:
            tag = normalize_tag(raw_name)
            if tag:
                concept_nodes[str(node.get("id", raw_name))] = tag
            continue
        canonical_name, entity_type = normalized

        if canonical_name not in node_descriptions:
            node_input_order.append(canonical_name)

        id_to_name[str(node.get("id", canonical_name))] = canonical_name
        node_descriptions[canonical_name].append(node.get("description", ""))
        node_type_votes[canonical_name].append(entity_type)
        for raw_tag in node.get("tags", []):
            tag = normalize_tag(raw_tag)
            if tag and tag != canonical_name:
                node_tags[canonical_name].add(tag)
        fallback_article_counts[canonical_name] = max(
            fallback_article_counts[canonical_name],
            int(node.get("article_count") or node.get("references") or 0),
        )
        fallback_mention_counts[canonical_name] = max(
            fallback_mention_counts[canonical_name],
            int(node.get("mention_count") or node.get("references") or 0),
        )

    real_metrics = compute_entity_metrics(node_input_order, article_texts)
    kept_name_set = set(node_input_order)

    for name, tags in list(node_tags.items()):
        node_tags[name] = {tag for tag in tags if normalize_tag(tag, kept_name_set)}

    for link in graph_data.get("links", []):
        source_key = resolve_link_key(link.get("source"))
        target_key = resolve_link_key(link.get("target"))
        source_name = resolve_link_name(link.get("source"), id_to_name)
        target_name = resolve_link_name(link.get("target"), id_to_name)

        if source_key in concept_nodes and target_name in kept_name_set:
            tag = normalize_tag(concept_nodes[source_key], kept_name_set)
            if tag:
                node_tags[target_name].add(tag)
        if target_key in concept_nodes and source_name in kept_name_set:
            tag = normalize_tag(concept_nodes[target_key], kept_name_set)
            if tag:
                node_tags[source_name].add(tag)

    nodes = []
    article_sets: dict[str, set[str]] = {}
    for name in node_input_order:
        best_type = Counter(node_type_votes[name]).most_common(1)[0][0]
        metric = real_metrics.get(name, {})
        article_ids = set(metric.get("article_ids", set()))
        article_count = int(metric.get("article_count", 0)) or fallback_article_counts[name]
        mention_count = int(metric.get("mention_count", 0)) or fallback_mention_counts[name] or article_count

        article_sets[name] = article_ids
        nodes.append({
            "id": sanitize_id(name),
            "name": name,
            "type": best_type,
            "description": pick_best_description(node_descriptions[name]),
            "article_count": article_count,
            "mention_count": mention_count,
            "aliases": [alias for alias in entity_variants(name) if alias != name],
            "tags": sorted(node_tags.get(name, set())),
            "references": article_count,
        })

    kept_names = {node["name"] for node in nodes}

    link_groups: dict[tuple[str, str], dict[str, object]] = {}
    for link in graph_data.get("links", []):
        source_name = resolve_link_name(link.get("source"), id_to_name)
        target_name = resolve_link_name(link.get("target"), id_to_name)
        if source_name not in kept_names or target_name not in kept_names or source_name == target_name:
            continue

        link_type = normalize_relation_type(link.get("relation_type") or link.get("type") or "related")
        if link_type in BORING_RELATION_TYPES:
            continue

        source_name, target_name = sorted((source_name, target_name))
        key = (source_name, target_name)
        group = link_groups.setdefault(key, {
            "types": Counter(),
            "labels": Counter(),
            "fallback_weight": 0,
        })
        group["types"][link_type] += 1
        label = str(link.get("label") or link_type).strip() or link_type
        group["labels"][label] += 1
        group["fallback_weight"] += int(link.get("weight") or 1)

    links = []
    for (source_name, target_name), payload in link_groups.items():
        evidence_articles = sorted(article_sets.get(source_name, set()) & article_sets.get(target_name, set()))
        weight = len(evidence_articles)
        if weight == 0:
            weight = int(payload["fallback_weight"]) or 1

        link_type = payload["types"].most_common(1)[0][0]
        label = payload["labels"].most_common(1)[0][0]
        links.append({
            "source": sanitize_id(source_name),
            "target": sanitize_id(target_name),
            "relation_type": link_type,
            "type": link_type,
            "label": label,
            "weight": weight,
            "article_count": weight,
            "evidence_articles": evidence_articles,
        })

    nodes.sort(key=lambda node: (-node["mention_count"], -node["article_count"], node["name"]))
    links.sort(key=lambda link: (-link["weight"], link["source"], link["target"]))

    metadata = dict(graph_data.get("metadata") or {})
    metadata["source"] = metadata_source or metadata.get("source", "normalized")
    metadata["articleCount"] = len(article_texts)
    metadata["extractedAt"] = metadata.get("extractedAt") or __import__("datetime").date.today().isoformat()
    metadata["entityTypes"] = list(ALLOWED_ENTITY_TYPES)
    metadata["weighting"] = {
        "node": "mention_count",
        "edge": "weight",
    }

    return {
        "nodes": nodes,
        "links": links,
        "metadata": metadata,
    }


def normalize_graph_file(input_path: Path, output_path: Path | None = None, metadata_source: str | None = None) -> dict:
    graph_data = json.loads(input_path.read_text(encoding="utf-8"))
    normalized = normalize_graph_data(graph_data, metadata_source=metadata_source)

    target_path = output_path or input_path
    target_path.write_text(
        json.dumps(normalized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return normalized
