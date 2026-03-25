# Data Formats / 数据格式文档

This document describes the JSON schemas for all data files in the pipeline.

## Pipeline Data Flow

```
articles/*.md
    → data/extracted/{id}.json      (per-article extraction)
    → data/graph/canonical.json     (aggregated graph)
    → data/graph/canonical_corrected.json  (after overrides)
    → web-data/graph-view.json      (frontend graph)
    → web-data/leaderboards.json    (frontend leaderboards)
    → web-data/article-index.json   (frontend article list)
```

---

## `data/extracted/{id}.json` — Per-Article Extraction

Produced by `extract_gemini.py` via Gemini API, then normalized by `graph_builder.py`.

```jsonc
{
  "article": {
    "id": "001",                    // 3-digit article ID
    "title": "文章标题",
    "path": "articles/001_2023-01-15_author_title.md",
    "date": "2023-01-15",
    "author": "authorname",
    "content_hash": "sha256..."     // For change detection
  },
  "entities": [
    {
      "id": "entity-id",           // Sanitized lowercase ID
      "name": "Entity Name",       // Display name
      "type": "company|person|product|vc_firm",
      "description": "One-line description",
      "mention_count": 5,          // Mentions in article body
      "aliases": ["Alias 1"],
      "tags": ["tag1"]
    }
  ],
  "relationships": [
    {
      "source": "Entity A",        // Entity name (not ID)
      "target": "Entity B",
      "relation_type": "founder_of|works_at|...",
      "label": "Contextual description",
      "weight": 1,
      "strength": 5,               // Tier value (1-5)
      "confidence": "high|medium|low"
    }
  ],
  "metadata": {
    "model": "gemini-3.1-pro-preview",
    "prompt_version": "2026-03-15-vc-firm-relationship-v7",
    "entity_count": 12,
    "relationship_count": 8,
    "pruned_entities": [
      { "name": "Dropped Entity", "reason": "low-signal" }
    ]
  }
}
```

---

## `data/graph/canonical.json` — Aggregated Graph

Produced by `graph_builder.py`. Aggregates all per-article extractions into a unified graph. Weak edges and orphan nodes are pruned.

```jsonc
{
  "nodes": [
    {
      "id": "entity-id",
      "name": "Entity Name",
      "type": "company|person|product|vc_firm",
      "description": "Best description from all articles",
      "mention_count": 42,         // Total across all articles
      "article_count": 8,          // Number of articles mentioning this entity
      "aliases": ["Alias 1", "Alias 2"],
      "tags": ["tag1"],
      "references": 8,
      "source_article_count": 8,
      "source_articles": [
        {
          "article_id": "001",
          "title": "Article Title",
          "date": "2023-01-15",
          "path": "articles/001_...",
          "permalink": "/articles/001",
          "markdown_link": "articles/001_...",
          "mention_count": 5
        }
      ]
    }
  ],
  "links": [
    {
      "source": "entity-a",        // Node ID
      "target": "entity-b",        // Node ID
      "relation_type": "founder_of",
      "type": "founder_of",        // Duplicate of relation_type (legacy)
      "label": "Description",
      "weight": 3,
      "strength": 5,               // Relationship tier (1-5)
      "effective_weight": 18,      // strength * article_count + weight
      "article_count": 3,
      "evidence_articles": ["001", "005", "012"],
      "evidences": [
        {
          "article_id": "001",
          "title": "...",
          "permalink": "/articles/001",
          "label": "...",
          "weight": 1
        }
      ]
    }
  ],
  "metadata": {
    "source": "canonical-full-derived",
    "layer": "canonical",
    "articleCount": 68,
    "graphSchemaVersion": "2026-03-15-vc-firm-v3",
    "entityTypes": ["company", "product", "person"],
    "pruning": {
      "rule": "connected (degree >= 1) after weak-edge removal",
      "weakEdgesPruned": 12,
      "removedNodeCount": 45
    }
  }
}
```

---

## `web-data/graph-view.json` — Frontend Graph Data

Produced by `build_presentation.py`. Same structure as `canonical_corrected.json` with additional fields ensured.

Additional node fields:
- `degree` (int) — Number of connected edges
- `composite_weight` (float, 0-1) — Weighted score: `0.50*(degree/max_d) + 0.35*(tw_mc/max_tw_mc) + 0.15*(tw_ac/max_tw_ac)` where `tw_mc`/`tw_ac` are time-weighted mention/article counts with 180-day half-life decay

---

## `web-data/leaderboards.json` — Leaderboard Data

```jsonc
{
  "generatedAt": "2026-03-15T00:00:00Z",
  "segments": {
    "products": [
      {
        "rank": 1,
        "nodeId": "chatgpt",
        "name": "ChatGPT",
        "displayName": "ChatGPT",
        "type": "product",
        "degree": 25,
        "mention_count": 120,
        "article_count": 30,
        "composite_weight": 0.85,
        "description": "OpenAI推出的AI对话产品",
        "visualMode": "text",
        "asset": null,
        "featured": false,
        "leaderboardSegments": ["products"]
      }
    ],
    "founders": [],   // Top 20 persons with founder_of/co_founded edges
    "vcs": [],        // All vc_firm nodes
    "companies": []   // Top 20 company nodes
  }
}
```

---

## `web-data/article-index.json` — Article Index

```jsonc
{
  "generatedAt": "2026-03-16T07:00:46.715737+00:00",
  "count": 68,
  "isPartial": false,
  "missingArticleIds": [],
  "articles": [
    {
      "id": "001",
      "title": "Article Title",
      "date": "2025-05-26",
      "author": "authorname",
      "path": "articles/001_2025-05-26_author_title.md",
      "permalink": "/articles/001",
      "markdown_link": "articles/001_2025-05-26_author_title.md",
      "excerpt": "Article excerpt text...",
      "entity_count": 4,
      "relationship_count": 4
    }
  ]
}
```

---

## `data/config/display_registry.json` — Node Display Config

Controls visual rendering and leaderboard membership per node.

```jsonc
{
  "version": 2,
  "updatedAt": "2026-03-15T00:00:00Z",
  "defaults": { "leaderboardSize": 20 },
  "presentation": {
    "siteMode": "analysis-2d",
    "graphEngine": "cytoscape",
    "detailExperience": "drawer",
    "leaderboardStrategy": "auto-first"
  },
  "nodes": [
    {
      "nodeId": "chatgpt",
      "visualMode": "logo|text|image",
      "localAssetPath": "optional/path/to/asset",
      "featured": true,
      "leaderboardSegments": ["products"]
    }
  ]
}
```

---

## Entity Types (4)

| Type | Description |
|------|------------|
| `company` | Companies, organizations (non-investment) |
| `person` | Founders, CEOs, investors, key figures |
| `product` | Products, tools, apps, services, AI models |
| `vc_firm` | Venture capital firms, investment institutions |

## Relationship Types (15)

| Type | Direction | Category | Strength |
|------|-----------|----------|----------|
| `founder_of` | person → company | Structural | 5 |
| `co_founded` | person ↔ person | Structural | 5 |
| `acquires` | company → company | Structural | 5 |
| `invests_in` | person/company/vc_firm → company | Investment | 4 |
| `works_at` | person → company | Operational | 4 |
| `develops` | company → product | Operational | 4 |
| `competes_with` | same type ↔ same type | Competition | 3 |
| `works_on` | person → product | Operational | 3 |
| `partners_with` | company ↔ company | Collaboration | 3 |
| `criticizes` | person → any | Evaluation | 3 |
| `praises` | person → any | Evaluation | 3 |
| `mentors` | person → person | Evaluation | 3 |
| `compares_to` | same type ↔ same type | Competition | 2 |
| `collaborates_with` | person ↔ person | Collaboration | 2 |
| `integrates_with` | product ↔ product | Collaboration | 2 |
