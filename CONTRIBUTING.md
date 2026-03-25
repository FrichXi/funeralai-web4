# Contributing / 贡献指南

## Adding New Articles / 添加新文章

This is the most common contribution. Follow these steps:

1. **Name the file** following the pattern:
   ```
   {ID}_{YYYY-MM-DD}_{author}_{title}.md
   ```
   Example: `069_2026-03-20_zanai_新文章标题.md`

   - `ID`: 3-digit zero-padded, next sequential number
   - `YYYY-MM-DD`: Publication date
   - `author`: Author handle (no underscores)
   - `title`: Article title (underscores OK)

2. **Add YAML frontmatter** at the top:
   ```markdown
   ---
   title: 文章标题
   date: 2026-03-20
   author: zanai
   ---

   Article body here...
   ```

3. **Place the file** in `articles/`

4. **Run the pipeline**:
   ```bash
   python -m scripts.run_pipeline --articles 069
   ```

5. **Verify** the extracted entities in `data/extracted/069.json`

6. **Rebuild frontend data**:
   ```bash
   python -m scripts.run_pipeline present
   ```

## Fixing Entity Extraction Errors / 修正实体提取错误

Gemini's extraction is imperfect. Common errors:
- Wrong entity type (product labeled as company)
- Missing merges (same entity with different names)
- Missing relationships
- Wrong relationship types

All fixes go in `scripts/overrides.py`. This is a pure data file -- no logic, just declarations.

### Fix entity type

Add to `TYPE_CORRECTIONS`:
```python
TYPE_CORRECTIONS = {
    "node-id": "correct_type",  # product, company, person, or vc_firm
}
```

### Merge duplicate entities

Add to `NODE_MERGES`:
```python
NODE_MERGES = [
    {"keep": "canonical-id", "remove": ["duplicate-id-1", "duplicate-id-2"],
     "add_aliases": ["Alias 1"]},
]
```

### Add missing relationships

Add to `MISSING_EDGES`:
```python
MISSING_EDGES = [
    ("source-id", "target-id", "relation_type", "Description label"),
]
```

### Fix relationship types

Add to `EDGE_TYPE_FIXES`:
```python
EDGE_TYPE_FIXES = [
    ("source-id", "target-id", "old_type", {"new_type": "correct_type"}),
]
```

After editing `overrides.py`, rebuild:
```bash
python -m scripts.run_pipeline build
```

## Adding New Entity Types / 新增实体类型

1. **Python side** (`scripts/graph_utils.py`):
   - Add to `ALLOWED_ENTITY_TYPES`
   - Add to `TYPE_ALIASES` if needed

2. **Frontend side**:
   - `site/src/lib/types.ts` -- Add to `NodeType` union
   - `site/src/lib/constants.ts` -- Add to `NODE_TYPE_REGISTRY`

All other references (colors, labels, badges, legend, controls) derive automatically from the registry.

## Adding New Relationship Types / 新增关系类型

1. **Python side** (`scripts/graph_utils.py`):
   - Add to `RELATION_STRENGTH`
   - Add to `RELATION_ALIASES` if needed

2. **Frontend side**:
   - `site/src/lib/types.ts` -- Add to `RelationType` union
   - `site/src/lib/constants.ts` -- Add to `RELATION_STYLES`

## Pull Request Process / PR 流程

1. Fork the repo and create a feature branch
2. Make your changes
3. Run tests: `pytest tests/ -v`
4. Run frontend build: `cd site && npm run build`
5. Update `CHANGELOG.md` under `[Unreleased]`
6. Submit a PR with a clear description of what changed and why
