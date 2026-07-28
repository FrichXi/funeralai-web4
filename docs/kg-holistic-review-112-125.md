# KG Holistic Review: Articles 112-125

Date: 2026-07-28

## Scope

This review covers articles 112-125 after the weekday Substack automation brought the local corpus to 125 articles, 699 entities, and 1876 pre-review relationships. The corrected graph contains 699 entities and 1860 relationships.

The review command was:

```bash
python3 scripts/kg_review_gate.py --json-report /tmp/kg-review-112-125.json --no-fail
```

Gate findings before this review:

- `last_holistic_review_article`: 111
- `latest_article_id`: 125
- unreviewed articles: 14
- missing extracted entities in graph payload: 0
- missing extracted entities in article payloads: 0
- isolated mentioned entities: 2 (`B站直播`, `宰治`)
- relationship candidates: 198 advisory high co-mention pairs

## Decision

Most candidate pairs are benchmark comparisons, event co-presence, product roundups, satire, or author/tester interactions. They are not promoted to durable graph edges without a precise supported relationship.

Two durable ownership facts are added:

- 月之暗面 develops Kimi K3.
- 蚂蚁集团 develops/owns 灵波科技.

The review also removes or corrects extracted relationships whose own labels reveal a misread, or whose endpoints incorrectly turn a tester/user/co-mention into a product contributor. After rebuilding and verifying the graph, `pipeline.toml` advances `last_holistic_review_article` to `125`.

## Article Notes

- 112: Qwen, Alibaba, ByteDance, Seed, GLM, 千问APP, and Token事业群 ownership and competition facts are represented. Remaining high co-mentions are market comparison context.
- 113: MaineCoon, 猫薄荷, Vidu S1, and world-model comparisons are represented. 李飞飞/杨立昆 are parallel references, not a claimed direct collaboration.
- 114: Moya founder and ZhenFund investments in BodyPark/云望创新 are represented. Event co-presence is not a durable BodyPark/云望创新 comparison.
- 115: MuleRun, 陈宇森, 长亭科技, RainFly, and LibTV facts are represented. `B站直播` and `宰治` remain isolated after their weak event-only relation is pruned; no stronger supported type is invented.
- 116-117: MiniMax product ownership and model comparisons are represented. Satirical comparison with 陈冕, benchmark testing by 016, and an informal Hermes mention are not treated as durable product-development or partnership edges.
- 118: TapNow's comparison of itself to Codex is represented; the announcement adds no other durable relation.
- 119: LibTV, Liblib, MiniMax Hub, 即梦, and ByteDance facts are represented. “陈冕狂做 TapNow” is rhetorical comparison, not evidence that 陈冕 develops TapNow.
- 120: Raft, Tutti, Bloome, 飞书, 钉钉, and Codex integration/comparison facts are represented.
- 121: LingBot-World 2.0, 灵波科技, 灵光, and Ant ownership are represented. The Ant/灵波 parent relationship is added explicitly.
- 122: Kimi K3 benchmark comparisons and 唐杰 mentoring 杨植麟 are represented. The article explicitly says the K3 like came from 杨植麟's American mentor, so the extracted 唐杰-praises-K3 edge is removed. External benchmark testers are not K3 contributors. 月之暗面 ownership is added explicitly.
- 123: Step AOS, STEPX, STEPX Neo, Amoo, 超级Eva, 原力灵机, 千里科技, and 印奇 facts are represented. 唐圣 and 杨植麟 are parallel examples, not direct collaborators.
- 124: TapNow develops Creative OS and its 飞书/Frame.io integrations are represented. Hackathon creators used Creative OS; they did not work on developing the product.
- 125: Baidu product ownership, competition, criticism, and confirmed investment relationships are represented. Satirical endorsement of 范志毅 and the colloquial product-level `百度 invests_in LibTV` edge are not retained; the existing person-level Baidu investments remain.

## Follow-Up

Future imports should continue to treat `relationship_candidates` as review prompts rather than automatic override instructions. Production preflight must also keep the static export under the Cloudflare Pages file limit so a benchmark asset change cannot block article and graph releases.
