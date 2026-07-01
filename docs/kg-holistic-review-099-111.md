# KG Holistic Review: Articles 099-111

Date: 2026-07-02

## Scope

This review covers articles 099-111 after the Substack import and presentation build brought the local dataset to 111 articles, 629 entities, and 1656 relationships.

The review command was:

```bash
python3 scripts/kg_review_gate.py --json-report /tmp/kg-review-099-111.json --no-fail
```

Gate findings before this review:

- `last_holistic_review_article`: 098
- `latest_article_id`: 111
- unreviewed articles: 13
- missing extracted entities in graph payload: 0
- missing extracted entities in article payloads: 0
- isolated mentioned entities: 0
- relationship candidates: 120 advisory high co-mention pairs

## Decision

No new `MISSING_EDGES` overrides were added in this pass.

The 120 relationship candidates were reviewed as advisory co-mention pairs. The stable facts needed for frontend graph behavior are already represented by extracted relationships or existing overrides; the remaining candidates are mostly model comparison context, benchmark co-mentions, product roundups, or event/sponsor co-presence that should not be promoted to strong graph edges without a precise relation type.

After this review, `pipeline.toml` advances `last_holistic_review_article` to `111`.

## Article Notes

- 099: Core facts around Mindverse, 马卡龙, Neo Lab, 蚂蚁集团, Thinking Machines, LibTV, Qwen, and OpenCode are already represented. Model names such as Claude/Kimi/Qwen appear as comparison or market context, not stable Mindverse product edges.
- 100: Codex and Tripo co-occur in the hackathon narrative, but the article does not require a durable product/company relation beyond the extracted event relationships.
- 101: Existing relationships cover the intended Claude/Gemini/Codex and 灵光/点点/秒哒 comparisons.
- 102: Tencent product ownership and integrations for Marvis, QClaw, WorkBuddy, 微信, 腾讯云, and OpenClaw are already covered. Product-to-product co-mentions do not all imply direct integrations.
- 103: Kimi, Claude, Codex, Qwen, DeepSeek, Trae, Opencode, 智谱AI, and 杨植麟 are used in market and capability comparisons. Existing extracted relationships cover the stable Kimi/月之暗面 and model/tool facts.
- 104: Vidu, ViduClaw, 生数科技, PixVerse, 即梦, 可灵, and OpenClaw relationships are already represented through develops, compares_to, and competes_with edges.
- 105: Benchmark candidates are mostly leaderboard co-mentions. Existing extracted comparisons and developer relationships are sufficient.
- 106: LibTV, Lovart, Seedance, 火山引擎, 字节跳动, 腾讯, 蚂蚁, and 陈冕 relationships are already represented. Extra platform co-mentions should not be promoted.
- 107: MuleRun and Tripo are event co-sponsors/co-present participants; the existing weak contextual relationship is enough, and no stronger supported relation type is available.
- 108: The hardware roundup intentionally mentions Moya, Nuna, Looi, Odyss, and 拓竹 together. The stable founder/integration/comparison facts are already captured.
- 109: 智谱AI, Anthropic, GLM, Claude, Kimi, MiniMax, Codex, and LibTV are primarily benchmark or market-comparison co-mentions. Existing extracted model/company relationships are sufficient.
- 110: Seed benchmark update is intentionally dense with GLM, MiniMax, Step, Kimi, DeepSeek, Qwen, and 豆包 co-mentions. Existing benchmark comparisons, ByteDance ownership, and Seed integrations are sufficient.
- 111: 豆包, Seed, Trae, 字节跳动, 腾讯, WorkBuddy, 元宝, Blender, Claude, GPT, and Gemini relationships are already covered. Mentions of 葬爱咸鱼 reflect authorship/tester voice, not new graph facts beyond existing author edges.

## Follow-Up

Future imports should continue to treat `relationship_candidates` as review prompts, not automatic override instructions. Add overrides only when the article text supports one of the durable relation types in `site/src/lib/types.ts`.
