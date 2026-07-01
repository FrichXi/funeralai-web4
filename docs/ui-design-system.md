# 8-Bit 暗色像素风 UI 设计规范

> 源自葬AI Web4 项目。复制本文件到新项目的 `CLAUDE.md` 或 docs/ 中即可复用。
> 复用时把"品牌色"替换为你自己的主色即可，其余体系自洽。

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router, 静态导出) | ^14.2 |
| UI | React + TypeScript | ^18.3 / ^5.5 |
| 样式 | Tailwind CSS + tailwindcss-animate | ^3.4 |
| 组件基础 | shadcn/ui（自定义主题） + @radix-ui | latest |
| 类名工具 | class-variance-authority + clsx + tailwind-merge | — |
| 图标 | lucide-react | ^0.577 |
| 字体 | Fusion Pixel 12px（像素字体）+ GeistMono（代码字体） | — |

### 核心依赖（package.json 需安装）

```json
{
  "@base-ui/react": "^1.3.0",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-progress": "^1.1.7",
  "@radix-ui/react-scroll-area": "^1.2.9",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-tabs": "^1.1.12",
  "@radix-ui/react-tooltip": "^1.2.7",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "cmdk": "^1.1.1",
  "lucide-react": "^0.577.0",
  "shadcn": "^4.0.6",
  "tailwind-merge": "^3.5.0",
  "tailwindcss-animate": "^1.0.7",
  "tw-animate-css": "^1.4.0"
}
```

### 通用工具函数 `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 1. 色彩系统

### 设计原则

- **暗色优先**：背景极深（7% lightness），前景极浅（90%），高对比度
- **紫色品牌色**：所有强调元素用 `#7351cf`，辅以粉色/珊瑚色点缀
- **HSL CSS 变量**：所有颜色通过 CSS 变量定义，Tailwind 消费，方便全局替换

### 当前实现入口

- `site/src/app/globals.css`：全站 CSS 变量、基础字体、day/night 主题覆盖。
- `site/src/lib/visual-tokens.ts`：品牌色、图谱语义色、榜单色、测试页浅色系、主题转场色的 TS token 层。
- `site/src/lib/constants.ts`：图谱节点类型和关系类型 registry；它可以消费 visual tokens，但仍是图谱语义色对外入口。
- Feature-local 视觉配置可放在 feature 目录，例如 `components/leaderboard/leaderboard-visuals.ts`；不要把业务专用赞助榜主题塞进通用 primitive。

### CSS 变量（globals.css :root）

```css
@layer base {
  :root {
    --navbar-height: 2.5rem;

    --background: 255 10% 7%;           /* 几乎纯黑 */
    --foreground: 260 20% 90%;          /* 浅灰白 */

    --card: 260 30% 10%;                /* 比背景稍亮的卡片底 */
    --card-foreground: 260 20% 90%;

    --popover: 260 30% 10%;
    --popover-foreground: 260 20% 90%;

    --primary: 258 55% 57%;             /* 品牌紫 #7351cf */
    --primary-foreground: 0 0% 100%;    /* 白色文字 */

    --secondary: 260 30% 16%;           /* 深色次级 */
    --secondary-foreground: 260 20% 88%;

    --muted: 260 20% 14%;              /* 低调灰 */
    --muted-foreground: 260 10% 55%;

    --accent: 340 70% 65%;             /* 粉色强调 */
    --accent-foreground: 260 30% 7%;

    --destructive: 0 70% 50%;          /* 错误红 */
    --destructive-foreground: 0 0% 100%;

    --border: 260 25% 20%;             /* 边框色 */
    --input: 260 25% 18%;              /* 输入框底色 */
    --ring: 258 55% 57%;               /* 焦点环（同品牌色） */

    --radius: 0rem;                    /* ⚠️ 关键：零圆角，像素风核心 */
  }
}
```

> **如何换色**：只需修改 `--primary`、`--ring`、`--accent` 三个变量。其余灰阶/暗色系可保持不变。

### Tailwind 主题扩展（tailwind.config.ts）

```typescript
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
      },
      muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
      },
      accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
      },
      popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
      },
      card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
      },
    },
    borderRadius: {
      lg: "var(--radius)",
      md: "calc(var(--radius) - 2px)",
      sm: "calc(var(--radius) - 4px)",
    },
    dropShadow: {
      brand: "0 0 24px rgba(115, 81, 207, 0.4)",       // 品牌紫辉光
      "brand-lg": "0 0 40px rgba(115, 81, 207, 0.5)",   // 大面积紫辉光
    },
    fontFamily: {
      sans: ['"Fusion Pixel"', '"Press Start 2P"', "system-ui", "sans-serif"],
      mono: ["var(--font-mono)", "monospace"],
      retro: ['"Fusion Pixel"', '"Press Start 2P"', "system-ui", "sans-serif"],
    },
  },
},
plugins: [require("tailwindcss-animate")],
```

---

## 2. 字体系统

### 像素字体：Fusion Pixel

- **文件**：`public/fonts/fusion-pixel-12px-proportional.woff2`（需自行获取字体文件）
- **备选**：`Press Start 2P`（Google Fonts 上免费）
- **关键**：**禁用字体平滑**，保持像素锐利

```css
@font-face {
  font-family: "Fusion Pixel";
  src: url("/fonts/fusion-pixel-12px-proportional.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: "Fusion Pixel", "Press Start 2P", system-ui, sans-serif;
  -webkit-font-smoothing: none;        /* ⚠️ 禁用抗锯齿 */
  -moz-osx-font-smoothing: unset;
  line-height: 1.8;
}
```

### 代码字体：GeistMono

```typescript
// layout.tsx
import localFont from "next/font/local";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

// <html className={geistMono.variable}>
```

### 排版规则

| 场景 | 字号 | 行高 | 字间距 |
|------|------|------|--------|
| 正文 | text-xs ~ text-sm | 1.8 | 0.5px |
| 标题 | text-[24px] ~ text-[48px] | 默认 | tracking-wider |
| 品牌大标题 | text-[36px] md:text-[48px] | — | tracking-wider |
| 标签/徽章 | text-xs | — | — |
| 版权/次要 | text-[10px] | — | — |

### `.retro` 工具类

用于局部启用像素字体效果：

```css
.retro {
  font-family: "Fusion Pixel", "Press Start 2P", system-ui, -apple-system, sans-serif;
  line-height: 1.8;
  letter-spacing: 0.5px;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}

.pixelated {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

---

## 3. 像素边框系统（8-bit 核心）

这是整个设计风格的灵魂。用绝对定位的小块 div 模拟像素游戏的边框效果。

### 像素单位

- 基准像素单位：`1.5`（即 Tailwind 的 `w-1.5 h-1.5` = 6px）
- 用 absolute 定位在组件四周拼出"像素边框"

### Card 像素边框模式

```
┌──────────────────────┐  ← border-y-6（6px 实心顶边，full width）
│                      │
│  ┃  content area  ┃  │  ← border-x-6 侧边（通过 absolute div, -mx-1.5 偏移）
│                      │
└──────────────────────┘  ← border-y-6（6px 实心底边，full width）
```

**实现代码模式**：

```tsx
<div className="relative border-y-6 border-foreground dark:border-ring">
  {/* 侧边框 */}
  <div className="pointer-events-none absolute inset-y-0 -mx-1.5 border-x-6 border-foreground dark:border-ring" />
  {/* 内容 */}
  {children}
</div>
```

### Button 像素边框模式

更精细，有角落方块 + 阴影叠加：

```
  ┌─────────────────────┐
 ▪│     top bars        │▪  ← 角落 size-1.5 方块 + 顶部半宽条
  │                     │
 ▮│     content         │▮  ← 侧边条 w-1.5, h-[calc(100%-12px)]
  │                     │
 ▪│     bottom bars     │▪  ← 同上，底部
  └─────────────────────┘
  ▓▓▓▓▓ shadow overlay ▓▓▓  ← bg-foreground/20 阴影条
```

**关键实现**：

```tsx
{/* 顶部左半条 */}
<div className="absolute -top-1.5 left-1.5 h-1.5 w-1/2 bg-foreground dark:bg-ring" />
{/* 顶部右半条 */}
<div className="absolute -top-1.5 right-1.5 h-1.5 w-1/2 bg-foreground dark:bg-ring" />
{/* 左上角方块 */}
<div className="absolute -left-1.5 -top-0 size-1.5 bg-foreground dark:bg-ring" />
{/* 左侧边条 */}
<div className="absolute -left-1.5 top-1.5 h-[calc(100%-12px)] w-1.5 bg-foreground dark:bg-ring" />
{/* 阴影叠加（底部） */}
<div className="absolute -bottom-1.5 left-1.5 right-0 h-1.5 bg-foreground/20" />
```

### Badge 像素边框模式

简化版，只有左右两个像素条：

```tsx
{/* 左像素条 */}
<span className="absolute -left-1.5 inset-y-[4px] w-1.5 bg-current" />
{/* 右像素条 */}
<span className="absolute -right-1.5 inset-y-[4px] w-1.5 bg-current" />
```

### 边框配色规则

- **浅色模式**：`bg-foreground`
- **暗色模式**：`dark:bg-ring`（使用焦点环色 = 品牌紫）
- 阴影叠加：`bg-foreground/20`（20% 透明度）

---

## 4. 交互与动效

### 按钮按压效果

```css
active:translate-y-1    /* 按下时下沉 1 单位 */
```

### 过渡动画

```css
transition-colors       /* 颜色变化 */
transition-opacity       /* 透明度 */
transition-all           /* 通用（慎用） */
```

### 侧栏/抽屉滑入

```css
data-[state=open]:animate-in      duration-500ms
data-[state=closed]:animate-out   duration-300ms
slide-in-from-right / slide-out-to-right
```

### 辉光效果

品牌元素使用 drop-shadow 辉光：

```css
drop-shadow-[0_0_24px_rgba(115,81,207,0.4)]     /* 标准辉光 */
drop-shadow-[0_0_40px_rgba(115,81,207,0.5)]     /* 大面积辉光 */
```

### 像素 Spinner

两种样式：

1. **经典旋转**：SVG 矩形组成的环，`animate-spin`
2. **菱形闪烁**：8 个像素点，交错延迟 0~0.7s，0.8s 循环

---

## 5. 布局系统

### Z-Index 层级

```
GRAPH/页面控件:  z-20
TOOLTIP:         z-30
DRAWER/抽屉:     z-40
NAVBAR:          z-50
```

### 导航栏

```
sticky top-0 z-50
h-[var(--navbar-height)]          /* 2.5rem */
border-b border-border
bg-background/60 backdrop-blur-sm /* 半透明毛玻璃 */
```

- Logo：`h-6`, `image-rendering: pixelated`
- 链接：`text-xs`，激活态 `text-primary`，非激活态 `text-muted-foreground hover:text-foreground`

### 页脚

```
border-t border-border py-6
text-center text-xs text-muted-foreground
版权信息: text-[10px] text-muted-foreground/60
```

### 页面容器

```
max-w-* + mx-auto + px-4~6
```

### 网格布局

```css
grid gap-6
sm:grid-cols-1
md:grid-cols-2
lg:grid-cols-3
```

### 落地页居中布局

```
min-h-screen flex flex-col items-center justify-center
```

---

## 6. 组件风格速查

### Card（卡片）

```
8-bit 像素边框（见第 3 节）
bg-card text-card-foreground
hover:border-primary/50 transition-colors
内部：CardHeader → CardContent → CardFooter
```

### Badge（徽章）

```
text-xs rounded-none
8-bit 左右像素条
variants: default(品牌色底), secondary(灰底), destructive(红底), outline(边框), ghost(透明)
```

### Button（按钮）

```
text-xs ~ text-sm rounded-none
8-bit 全像素边框 + 阴影叠加
active:translate-y-1
variants: default(品牌色底), secondary, destructive, outline(边框), ghost, link
```

### Input（输入框）

```
8-bit 上下+左右像素边框
bg-input text-foreground
placeholder:text-muted-foreground
```

### Table（表格）

```
header: border-b-4 border-foreground dark:border-ring
rows: border-dashed border-b-4
8-bit 侧边框
```

### Tabs（标签页）

```
8-bit 像素边框包裹 TabsList
bg-card rounded-none
active: bg-accent text-foreground
inactive: text-muted-foreground
```

### Separator（分隔线）

```
dashed 模式：16px 重复 pattern，75% 实线
```

### Progress（进度条）

```
retro 模式：20 个像素方块
填充方块数 = Math.round((value / 100) * 20)
border-y-4, border-x-4 像素边框
```

---

## 7. 视觉关键词 & 设计决策

| 决策 | 理由 |
|------|------|
| `--radius: 0rem` | 零圆角 = 像素游戏窗口感 |
| 字体平滑关闭 | 保持像素字体的锐利感，不被浏览器反锯齿模糊 |
| 边框用 div 模拟而非 CSS border | CSS border 无法做"角落缺口"效果，div 拼接才能还原像素风 |
| `border-y-6` 做顶底边 | 6px 厚边 ≈ 复古游戏窗口边框宽度 |
| 品牌色辉光（drop-shadow） | 模拟 CRT 显示器上亮色文字的 bloom 效果 |
| `bg-background/60 backdrop-blur-sm` | 导航栏半透明 + 毛玻璃，兼具现代感和复古调性 |
| `image-rendering: pixelated` | 像素图放大时保持锐利，不被浏览器模糊插值 |

---

## 8. 快速启动清单

用这套设计系统初始化新项目时：

1. **初始化 Next.js**：`npx create-next-app@14 --typescript --tailwind --app`
2. **安装依赖**：参照上方依赖列表
3. **初始化 shadcn**：`npx shadcn@latest init`，选 New York 主题
4. **复制字体文件**：`fusion-pixel-12px-proportional.woff2` → `public/fonts/`
5. **替换 globals.css**：用本文档第 1 节的 CSS 变量
6. **替换 tailwind.config.ts**：用本文档第 1 节的主题扩展
7. **创建 8-bit 组件**：按第 3 节的像素边框模式，包装 shadcn 基础组件
8. **添加 retro.css**：第 2 节的 `.retro` 和 `.pixelated` 工具类
9. **创建 `lib/utils.ts`**：`cn()` 函数
10. **创建视觉 token 层**：把跨组件复用的品牌/语义/榜单/浅色页颜色集中到 `lib/visual-tokens.ts`
11. **按需换色**：修改 `--primary`、`--ring`、`--accent`、`dropShadow.brand`，再同步 token 层里的命名色值

---

## 9. 整体风格一句话描述

> **暗色背景 + 像素字体（Fusion Pixel）+ 零圆角 + 6px 厚像素边框（div 拼接）+ 品牌紫辉光 + 按钮按压下沉 + 导航栏毛玻璃 + CRT bloom 效果。**
>
> 复古 8-bit 游戏 UI 的视觉语言，搭配现代 Web 的交互与响应式布局。
