# 葬AI 知识图谱分析站点

## 项目概述

为中文 AI 行业评论媒体"葬AI"搭建公开知识图谱分析站点。68 篇文章经 Gemini 提取实体与关系，聚合为 472 节点、701 条边的知识图谱。纯静态部署，无后端。

## 品牌风格

- **品牌色**: `#7351cf`（紫色）
- **辅助色**: 粉色/珊瑚色（来自 logo 物料）
- **风格关键词**: 非主流、大胆、叛逆、像素风元素
- **品牌物料位置**: `葬ai物料/`
- **Logo**: "@葬AI"，有像素风按钮版本
- 暗色主题为主，紫色背景 + 强对比

## 数据文件

| 文件 | 用途 |
|------|------|
| `web-data/graph-view.json` | 主图谱：472 nodes + 701 links |
| `web-data/article-index.json` | 68 篇文章索引 |
| `web-data/articles/{001-068}.json` | 单篇文章详情（body_markdown、entities、relationships） |
| `web-data/leaderboards.json` | 4 个分类排行榜（products/founders/vcs/companies） |
| `data/config/display_registry.json` | 节点展示配置（sizeBoost、visualMode、featured） |

## 技术架构

```
site/                          # Next.js 项目根目录
├── public/data/               # prebuild 脚本从 web-data/ 拷贝
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 暗色主题 + 导航
│   │   ├── page.tsx           # 首页（统计概览 + 导航入口）
│   │   ├── graph/page.tsx     # 知识图谱（CSR）
│   │   ├── leaderboard/page.tsx
│   │   └── articles/
│   │       ├── page.tsx       # 文章列表
│   │       └── [id]/page.tsx  # 文章详情（SSG）
│   ├── components/
│   │   ├── layout/            # Navbar, Footer
│   │   ├── graph/             # GraphCanvas, GraphControls, GraphLegend
│   │   ├── entity/            # EntityDrawer
│   │   ├── leaderboard/       # SegmentTabs, RankingCard
│   │   └── article/           # ArticleList, ArticleBody, EntityTag
│   └── lib/
│       ├── types.ts           # 全部 TS 类型定义
│       ├── data.ts            # 数据加载工具
│       ├── graph-config.ts    # Cytoscape 样式/布局配置
│       └── constants.ts       # 颜色、关系类型映射
```

## 路由与渲染策略

| 路由 | 渲染 | 数据加载 |
|------|------|----------|
| `/` | SSG | 从 article-index 读统计 |
| `/graph` | SSG shell + CSR canvas | graph-view.json 客户端 fetch |
| `/leaderboard` | SSG | leaderboards.json 构建时读取 |
| `/articles` | SSG | article-index.json 构建时读取 |
| `/articles/[id]` | SSG（generateStaticParams） | 各 article JSON 构建时读取 |

## 核心依赖

```
next ^14.2, react ^18.3, typescript ^5.5
cytoscape ^3.30, cytoscape-fcose ^2.2
react-markdown ^9.0, remark-gfm ^4.0
tailwindcss ^3.4
UI 框架: 待定（见下方方案对比）
```

## 图谱实现要点

### Cytoscape 配置
- **布局**: `fcose`（快速力导向，适合 472 节点）
- **节点大小**: `Math.max(20, 10 + Math.log2(mention_count + 1) * 8)`
- **featured 节点**: 应用 display_registry 中的 sizeBoost 乘数
- **动态导入**: `dynamic(() => import('./GraphCanvas'), { ssr: false })`

### 节点/边样式
- 节点颜色需适配品牌紫色系
- 边按关系分组着色（结构/创始/投资/竞争/合作/评价）

### 交互
1. 点击节点 → EntityDrawer + 高亮邻居
2. 搜索 → 匹配 name + aliases，聚焦节点
3. 类型筛选 → checkbox 过滤 company/person/product
4. URL 参数 `?focus=nodeId` → 初始化定位
5. 双击节点 → 缩放邻域

## 15 种关系类型

acquires, co_founded, collaborates_with, compares_to, competes_with, criticizes, develops, founder_of, integrates_with, invests_in, mentors, partners_with, praises, works_at, works_on

## 构建与部署

```js
// next.config.ts
{ output: 'export', images: { unoptimized: true }, trailingSlash: true }
```

- prebuild 脚本: `web-data/` → `site/public/data/`
- `next build` → 纯静态 `out/`
- 部署目标: Vercel / Netlify / Cloudflare Pages

## 实现阶段

### Phase 1: 脚手架
1. `site/` 下初始化 Next.js + TS + Tailwind
2. `lib/types.ts` 定义所有数据类型
3. prebuild 脚本 + `lib/data.ts`
4. RootLayout 暗色主题 + Navbar

### Phase 2: 静态页面
5. `/articles` 文章列表
6. `/articles/[id]` 文章详情 + markdown 渲染
7. `/leaderboard` 排行榜

### Phase 3: 图谱
8. GraphCanvas + cytoscape 初始化
9. useGraphData hook + 数据转换
10. graph-config.ts 样式 + fcose 布局
11. GraphControls（搜索 + 类型筛选）
12. GraphLegend

### Phase 4: 实体交互
13. EntityDrawer 组件
14. 节点点击 → drawer + 高亮邻居
15. 文章内 EntityTag + 图谱跳转

### Phase 5: 首页 + 打磨
16. 首页统计概览
17. 移动端适配
18. loading 状态 + 错误边界
