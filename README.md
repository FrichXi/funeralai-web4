<div align="center">
  <img src="site/public/logo.png" alt="葬AI Knowledge Graph" width="360" />
  <p><a href="https://funeralai.cc"><strong>funeralai.cc</strong></a></p>
</div>

---

68 篇中文 AI 行业评论文章，经 Gemini 抽取实体与关系，聚合成一张可交互的知识图谱。

谁投了谁，谁抄了谁，谁吹了谁，谁埋了谁 — 看图就知道。

## 在线访问

**[funeralai.cc](https://funeralai.cc)**

不想本地跑的话，直接看线上版。

## 数据流水线

```
articles/*.md              68 篇原始文章
       │
       ▼
extract_gemini.py          Gemini 实体/关系抽取
       │
       ▼
data/extracted/{id}.json   逐篇抽取结果
       │
       ▼
post_process.py            声明式校正（overrides.py）
       │
       ▼
build_presentation.py      生成前端数据
       │
       ▼
web-data/*.json            graph-view · leaderboards · article-index
       │
       ▼
site/                      Next.js 14 静态站 + Cytoscape.js 图谱
```

简单说就是：文章进去，知识图谱出来。中间全自动，校正靠声明式规则。

## 本地运行

```bash
git clone https://github.com/FrichXi/funeralai-web4.git
cd funeralai-web4

# 后端
pip install -r requirements.txt
cp .env.example .env          # 填入 GEMINI_API_KEY

# 前端
cd site && npm install && cd ..

# 跑流水线
python -m scripts.run_pipeline

# 启动开发服务器
cd site && npm run dev
```

需要：Python 3.10+、Node.js 18+、Gemini API key。

流水线也可以分步跑：

```bash
python -m scripts.run_pipeline extract     # 只跑 Gemini 抽取
python -m scripts.run_pipeline build       # 后处理 + 生成前端数据
python -m scripts.run_pipeline present     # 只重新生成前端 JSON
python -m scripts.run_pipeline --articles 069 070  # 指定文章
```

## 技术栈

| 层 | 用什么 |
|----|--------|
| 抽取 | Python · Gemini API |
| 前端 | Next.js 14 (SSG) · TypeScript · Cytoscape.js |
| 测试 | pytest · vitest |
| 部署 | 静态导出，丢到任何 CDN |

## 项目结构

```
├── articles/              原始文章（001-068）
├── scripts/               Python 流水线
├── data/                  配置、抽取产物、图谱数据
├── web-data/              前端 JSON（生成的）
├── site/                  Next.js 14 前端
├── pipeline.toml          流水线配置
└── tests/                 pytest + vitest
```

## 相关项目

- [funeralai](https://github.com/FrichXi/funeralai) — 分析框架本体，Claude Code / Codex skill
- [funeral-cli](https://github.com/FrichXi/funeral-cli) — CLI / TUI 交互工具，`pip install funeralai`

## License

[MIT](LICENSE)
