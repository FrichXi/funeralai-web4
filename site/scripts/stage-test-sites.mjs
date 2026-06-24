import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.dirname(SCRIPT_DIR);
const PROJECT_ROOT = path.dirname(SITE_DIR);
const SOURCE_ROOT =
  process.env.TEST_SOURCE_ROOT || "/Users/xixiangyu/Documents/cc写作/qwen";
const RECHECK_DIR =
  process.env.TEST_RECHECK_DIR ||
  path.join(SOURCE_ROOT, "append-20260623", "stability-full-20260624");
const SCORE_CSV = path.join(RECHECK_DIR, "full-stability-recheck.csv");
const SCORE_JSON = path.join(RECHECK_DIR, "full-stability-recheck.json");
const SCORE_REPORT = path.join(RECHECK_DIR, "full-stability-recheck.md");
const GRAPHWEIGHTED_RECHECK_DIR =
  process.env.TEST_GRAPHWEIGHTED_RECHECK_DIR ||
  path.join(SOURCE_ROOT, "append-20260623");
const GRAPHWEIGHTED_SCORE_CSV = path.join(
  GRAPHWEIGHTED_RECHECK_DIR,
  "playwright-recheck-graphweighted.csv"
);
const GRAPHWEIGHTED_SCORE_JSON = path.join(
  GRAPHWEIGHTED_RECHECK_DIR,
  "playwright-recheck-graphweighted.json"
);
const GRAPHWEIGHTED_SCORE_REPORT = path.join(
  GRAPHWEIGHTED_RECHECK_DIR,
  "playwright-recheck-graphweighted.md"
);
const EFFICIENCY_CSV =
  process.env.TEST_EFFICIENCY_CSV ||
  path.join(
    SOURCE_ROOT,
    "append-20260623",
    "model-call-logs-20260623",
    "extracted",
    "cross-model-comparison.csv"
  );
const MODEL_LOG_ANALYSIS =
  process.env.TEST_MODEL_LOG_ANALYSIS ||
  path.join(SOURCE_ROOT, "append-20260623", "model-call-logs-20260623", "model-log-analysis.md");
const LEGACY_MANIFEST =
  process.env.TEST_LEGACY_MANIFEST ||
  path.join(SOURCE_ROOT, "append-20260623", "legacy-6-model", "manifest.json");
const LEGACY_SCORE_CSV =
  process.env.TEST_LEGACY_SCORE_CSV ||
  path.join(SOURCE_ROOT, "append-20260623", "legacy-6-model", "playwright-recheck-graphweighted.csv");
const LEGACY_SCORE_JSON =
  process.env.TEST_LEGACY_SCORE_JSON ||
  path.join(SOURCE_ROOT, "append-20260623", "legacy-6-model", "playwright-recheck-graphweighted.json");
const LEGACY_SCORE_REPORT =
  process.env.TEST_LEGACY_SCORE_REPORT ||
  path.join(SOURCE_ROOT, "append-20260623", "legacy-6-model", "playwright-recheck-graphweighted.md");
const TEST_SHARED_DATA_DIR =
  process.env.TEST_SHARED_DATA_DIR ||
  path.join(SOURCE_ROOT, "append-20260623", "web4-b110bf9", "web-data");
const TEST_DEST = path.join(SITE_DIR, "public", "test");
const EXPECTED_TEST_ARTICLE_COUNT = 104;
const EXPECTED_TEST_LATEST_ARTICLE_ID = "104";
const EXPECTED_TEST_LATEST_ARTICLE_DATE = "2026-06-15";
const SCORE_STANDARD = "playwright-recheck-composite-stability-20260624";
const TEST_ASSET_VERSION = "20260624-composite-stability";
const TEST_METHOD_REPO_URL =
  process.env.TEST_METHOD_REPO_URL || "https://github.com/FrichXi/personal-work-benchmark";
const TEST_METHODOLOGY_URL = "/test/methodology/";
const TEST_SCORE_CSV_URL = "/test/playwright-recheck-composite.csv";
const TEST_SCORE_JSON_URL = "/test/playwright-recheck-composite.json";
const TEST_REPORT_URL = "/test/playwright-recheck-composite.md";
const TEST_GRAPHWEIGHTED_CSV_URL = "/test/playwright-recheck-graphweighted.csv";
const TEST_GRAPHWEIGHTED_JSON_URL = "/test/playwright-recheck-graphweighted.json";
const TEST_GRAPHWEIGHTED_REPORT_URL = "/test/playwright-recheck-graphweighted.md";
const TEST_MODEL_LOG_ANALYSIS_URL = "/test/model-log-analysis.md";
const TEST_EFFICIENCY_CSV_URL = "/test/cross-model-comparison.csv";
const TEST_DATA_VERSION =
  "2026-06-15-visible-graph-audit-v2+2026-06-23-append-doubao-step+2026-06-24-composite-stability";
const TEST_SCORE_FORMULA =
  "复合评分 = loading 15 + adjusted graph/25*35 + articles/25*15 + visual 20 + interaction 15；adjusted graph 来自全量图谱稳定性复核";
const EFFICIENCY_WEIGHTS = {
  cost: 0.4,
  wallMinutes: 0.25,
  calls: 0.2,
  tokensTotal: 0.15,
};

const MODELS = [
  {
    name: "DeepSeek",
    slug: "deepseek-v4-pro",
    version: "DeepSeek V4 Pro",
    title: "DeepSeek V4 Pro",
    icon: "diamond",
  },
  {
    name: "Kimi",
    slug: "kimi-k2-7-code",
    sourceSlug: "kimi-k2.7-code",
    version: "Kimi K2.7 Code",
    title: "Kimi K2.7 Code",
    icon: "moon",
  },
  {
    name: "Qwen",
    slug: "qwen3-7-max",
    sourceSlug: "qwen3.7-max",
    version: "Qwen3.7 Max",
    title: "Qwen3.7 Max",
    icon: "grid",
  },
  {
    name: "GLM",
    slug: "glm-x-preview",
    version: "GLM 5.2",
    title: "GLM 5.2",
    icon: "spark",
  },
  {
    name: "MiniMax",
    slug: "minimax-m3",
    version: "MiniMax M3",
    title: "MiniMax M3",
    icon: "bolt",
  },
  {
    name: "Opus 4.8",
    slug: "claude-opus-4-8",
    version: "Claude Opus 4.8",
    title: "Claude Opus 4.8",
    icon: "crystal",
  },
  {
    name: "Doubao",
    slug: "doubao-seed-2-1-pro-260628",
    version: "Doubao Seed 2.1 Pro",
    title: "Doubao Seed 2.1 Pro",
    icon: "diamond",
  },
  {
    name: "Step",
    slug: "step-3-7-flash",
    sourceSlug: "step-3.7-flash",
    version: "Step 3.7 Flash",
    title: "Step 3.7 Flash",
    icon: "spark",
  },
];

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".svg",
  ".txt",
  ".xml",
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizeArticleId(value) {
  return String(value ?? "").padStart(3, "0");
}

async function validateFrozenTestData(dataDir) {
  const articleIndexPath = path.join(dataDir, "article-index.json");
  const graphPath = path.join(dataDir, "graph-view.json");
  const leaderboardsPath = path.join(dataDir, "leaderboards.json");
  const articlesDir = path.join(dataDir, "articles");

  invariant(await exists(articleIndexPath), `Missing frozen test article index: ${articleIndexPath}`);
  invariant(await exists(graphPath), `Missing frozen test graph data: ${graphPath}`);
  invariant(await exists(leaderboardsPath), `Missing frozen test leaderboards: ${leaderboardsPath}`);
  invariant(await exists(articlesDir), `Missing frozen test articles directory: ${articlesDir}`);

  const articleIndex = await readJson(articleIndexPath);
  const articles = Array.isArray(articleIndex.articles) ? articleIndex.articles : [];
  const latestArticle = articles[articles.length - 1] || {};
  const latestId = normalizeArticleId(latestArticle.id);
  const articleFiles = (await readdir(articlesDir)).filter((file) => file.endsWith(".json"));

  invariant(
    articleIndex.count === EXPECTED_TEST_ARTICLE_COUNT && articles.length === EXPECTED_TEST_ARTICLE_COUNT,
    `Frozen /test data must contain ${EXPECTED_TEST_ARTICLE_COUNT} articles; got count=${articleIndex.count}, entries=${articles.length}`
  );
  invariant(
    latestId === EXPECTED_TEST_LATEST_ARTICLE_ID &&
      latestArticle.date === EXPECTED_TEST_LATEST_ARTICLE_DATE,
    `Frozen /test data latest article must be ${EXPECTED_TEST_LATEST_ARTICLE_ID} / ${EXPECTED_TEST_LATEST_ARTICLE_DATE}; got ${latestId} / ${latestArticle.date}`
  );
  invariant(
    articleFiles.length === EXPECTED_TEST_ARTICLE_COUNT,
    `Frozen /test data must contain ${EXPECTED_TEST_ARTICLE_COUNT} article payloads; got ${articleFiles.length}`
  );
  invariant(
    articleFiles.includes(`${EXPECTED_TEST_LATEST_ARTICLE_ID}.json`) && !articleFiles.includes("105.json"),
    "Frozen /test data must stop at article 104 and must not include article 105"
  );

  const graph = await readJson(graphPath);
  invariant(
    graph.metadata?.articleCount === EXPECTED_TEST_ARTICLE_COUNT &&
      graph.metadata?.includedArticleCount === EXPECTED_TEST_ARTICLE_COUNT,
    `Frozen /test graph metadata must be ${EXPECTED_TEST_ARTICLE_COUNT} articles; got articleCount=${graph.metadata?.articleCount}, includedArticleCount=${graph.metadata?.includedArticleCount}`
  );
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

async function readScores() {
  if (!(await exists(SCORE_JSON))) {
    return new Map();
  }

  const raw = await readFile(SCORE_JSON, "utf8");
  const data = JSON.parse(raw);
  const records = Array.isArray(data) ? data : data.entries || data.results || [];
  const rows = new Map();

  for (const row of records) {
    const oldScore = row.oldScore || {};
    const adjustedScore = row.adjustedScore || {};
    const stability = row.stability || {};
    const key = `${row.round}:${row.model}`;
    const oldGraph25 = numericOrNull(oldScore.graph25);
    const adjustedGraph25 = numericOrNull(adjustedScore.adjustedGraph25);
    const articlesOld25 = numericOrNull(oldScore.articles25);
    const stabilityStatus = stability.status || "unknown";
    const observedPenaltyGraph25 = numericOrNull(stability.observedPenaltyGraph25);
    const effectivePenaltyGraph25 = numericOrNull(stability.effectivePenaltyGraph25);
    const evidence = buildCompositeEvidence({
      baseEvidence: oldScore.evidence,
      stabilityStatus,
      oldGraph25,
      adjustedGraph25,
      observedPenaltyGraph25,
      effectivePenaltyGraph25,
    });

    rows.set(key, {
      model: row.model,
      round: row.round,
      score: numericOrNull(adjustedScore.adjustedScore),
      grade: adjustedScore.adjustedGrade || gradeForPending(adjustedScore.adjustedScore),
      loading: numericOrNull(oldScore.loading),
      graph: Number.isFinite(adjustedGraph25) ? Number(((adjustedGraph25 / 25) * 35).toFixed(1)) : null,
      articles: Number.isFinite(articlesOld25)
        ? Number(((articlesOld25 / 25) * 15).toFixed(1))
        : null,
      visual: numericOrNull(oldScore.visual),
      interaction: numericOrNull(oldScore.interaction),
      evidence,
      scoreSource: SCORE_STANDARD,
      adjustedRank: numericOrNull(row.adjustedRank),
      graphWeightedRank: numericOrNull(oldScore.rank),
      graphWeightedScore: numericOrNull(oldScore.score),
      graphWeightedGrade: oldScore.grade || null,
      graphWeightedGraph: Number.isFinite(oldGraph25)
        ? Number(((oldGraph25 / 25) * 35).toFixed(1))
        : null,
      oldGraph25,
      adjustedGraph25,
      stabilityStatus,
      observedPenaltyGraph25,
      effectivePenaltyGraph25,
      sampleKind: row.sampleKind || "unknown",
      avgChangedRatio: numericOrNull(stability.avgChangedRatio),
      avgMeanAbs: numericOrNull(stability.avgMeanAbs),
      maxChangedRatio: numericOrNull(stability.maxChangedRatio),
      maxMeanAbs: numericOrNull(stability.maxMeanAbs),
    });
  }

  return rows;
}

function numericOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumberForEvidence(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildCompositeEvidence({
  baseEvidence,
  stabilityStatus,
  oldGraph25,
  adjustedGraph25,
  observedPenaltyGraph25,
  effectivePenaltyGraph25,
}) {
  const evidence = String(baseEvidence || "").trim();

  if (stabilityStatus === "stable" && !effectivePenaltyGraph25) {
    return evidence;
  }

  const audit =
    `stability audit: ${stabilityStatus}; Graph/25 ${formatNumberForEvidence(oldGraph25)}` +
    ` -> ${formatNumberForEvidence(adjustedGraph25)}; observed penalty ` +
    `${formatNumberForEvidence(observedPenaltyGraph25)}, applied penalty ` +
    `${formatNumberForEvidence(effectivePenaltyGraph25)}.`;

  return evidence ? `${evidence} ${audit}` : audit;
}

function average(values) {
  const valid = values.filter(Number.isFinite);

  if (!valid.length) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function buildModelScoreStats(scores) {
  const grouped = new Map();

  for (const score of scores.values()) {
    if (!Number.isFinite(score.score)) continue;

    const rows = grouped.get(score.model) || [];
    rows.push(score.score);
    grouped.set(score.model, rows);
  }

  const ranked = Array.from(grouped.entries())
    .map(([model, values]) => {
      const avg = average(values);
      return {
        model,
        avg: Number.isFinite(avg) ? Number(avg.toFixed(2)) : null,
      };
    })
    .filter((item) => Number.isFinite(item.avg))
    .sort((a, b) => b.avg - a.avg || a.model.localeCompare(b.model));

  return new Map(
    ranked.map((item, index) => [
      item.model,
      {
        avg: item.avg,
        rank: index + 1,
      },
    ])
  );
}

function costLabelFor(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "暂缺";
  }

  if (text === "40.1-41.6 estimated") {
    return "估算 40.1-41.6 元";
  }

  if (text === "0 cash; 11.197 gift deduction") {
    return "0 元现金 / 11.2 元赠送";
  }

  const number = Number(text);
  if (Number.isFinite(number)) {
    return `${text} 元`;
  }

  return text;
}

function costSortCnyFor(value) {
  const text = String(value || "").trim();

  if (text === "40.1-41.6 estimated") {
    return 40.85;
  }

  if (text === "0 cash; 11.197 gift deduction") {
    return 11.197;
  }

  return numericOrNull(text);
}

function efficiencyNoteFor(row) {
  if (row.model === "GLM") {
    return "GLM 价格按国内 API 价折算，非平台实际现金账单。";
  }

  if (row.model === "Step") {
    return "Step 本轮现金支出为 0 元，平台赠送额度扣减 11.197 元。";
  }

  return row.platform_note || "";
}

function addAscendingRank(rows, valueKey, rankKey) {
  rows
    .slice()
    .sort((a, b) => {
      const aValue = Number.isFinite(a[valueKey]) ? a[valueKey] : Number.POSITIVE_INFINITY;
      const bValue = Number.isFinite(b[valueKey]) ? b[valueKey] : Number.POSITIVE_INFINITY;
      return aValue - bValue || a.model.localeCompare(b.model);
    })
    .forEach((row, index) => {
      row[rankKey] = index + 1;
    });
}

function addValueIndex(rows) {
  addAscendingRank(rows, "costSortCny", "costSortRank");
  addAscendingRank(rows, "wallMinutes", "wallMinutesRank");
  addAscendingRank(rows, "calls", "callsRank");
  addAscendingRank(rows, "tokensTotal", "tokensTotalRank");

  for (const row of rows) {
    const hasRanks = [
      row.costSortRank,
      row.wallMinutesRank,
      row.callsRank,
      row.tokensTotalRank,
    ].every(Number.isFinite);

    if (!Number.isFinite(row.scoreAvg) || !hasRanks) {
      row.consumptionRank = null;
      row.valueIndex = null;
      continue;
    }

    const consumptionRank =
      row.costSortRank * EFFICIENCY_WEIGHTS.cost +
      row.wallMinutesRank * EFFICIENCY_WEIGHTS.wallMinutes +
      row.callsRank * EFFICIENCY_WEIGHTS.calls +
      row.tokensTotalRank * EFFICIENCY_WEIGHTS.tokensTotal;

    row.consumptionRank = Number(consumptionRank.toFixed(2));
    row.valueIndex = Number((row.scoreAvg / consumptionRank).toFixed(2));
  }

  return rows.sort((a, b) => {
    const aValue = Number.isFinite(a.valueIndex) ? a.valueIndex : Number.NEGATIVE_INFINITY;
    const bValue = Number.isFinite(b.valueIndex) ? b.valueIndex : Number.NEGATIVE_INFINITY;
    return bValue - aValue || a.model.localeCompare(b.model);
  });
}

async function readEfficiencyLeaderboard(modelScoreStats) {
  if (!(await exists(EFFICIENCY_CSV))) {
    console.warn(`skip missing efficiency csv: ${EFFICIENCY_CSV}`);
    return [];
  }

  const modelsByName = new Map(MODELS.map((model) => [model.name, model]));
  const raw = await readFile(EFFICIENCY_CSV, "utf8");
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const rows = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const model = modelsByName.get(row.model);

    if (!model) {
      continue;
    }

    const scoreStats = modelScoreStats.get(model.name);

    rows.push({
      model: model.name,
      modelVersion: model.version,
      modelTitle: model.title,
      modelIcon: model.icon,
      modelSlug: model.slug,
      mainRank: scoreStats?.rank ?? numericOrNull(row.score_avg_rank),
      scoreAvg: scoreStats?.avg ?? numericOrNull(row.score_avg),
      tokensTotal: numericOrNull(row.opencode_total_visible_tokens),
      costLabel: costLabelFor(row.platform_cash_cny),
      costSortCny: costSortCnyFor(row.platform_cash_cny),
      calls: numericOrNull(row.opencode_calls),
      wallMinutes: numericOrNull(row.opencode_wall_minutes),
      note: efficiencyNoteFor(row),
    });
  }

  return addValueIndex(rows);
}

function sanitizePublicAnalysisMarkdown(text) {
  return text
    .replace(
      "- 原始日志已归档到 `raw/`：`step日志.xlsx`、`seed日志.pdf`、`doubao-console-usage-20260623.png`。",
      "- 原始日志和账单截图只保留在本地归档，不随公开页面或 GitHub 发布；公开版只发布汇总表、交叉对比 CSV 和结论。"
    )
    .replace(
      "- 旧 6 个模型的现金花费来自用户补充账单口径：",
      "- 追加前模型的现金花费来自用户补充账单口径："
    );
}

async function writePublicAnalysisArtifacts() {
  if (await exists(MODEL_LOG_ANALYSIS)) {
    const analysis = await readFile(MODEL_LOG_ANALYSIS, "utf8");
    await writeFile(
      path.join(TEST_DEST, "model-log-analysis.md"),
      sanitizePublicAnalysisMarkdown(analysis)
    );
  } else {
    console.warn(`skip missing model log analysis: ${MODEL_LOG_ANALYSIS}`);
  }

  await copyPublicArtifact(EFFICIENCY_CSV, path.join(TEST_DEST, "cross-model-comparison.csv"));
}

async function detectSiteRoot(sourceDir) {
  const candidates = [
    sourceDir,
    path.join(sourceDir, "web4-static"),
    path.join(sourceDir, "out"),
    path.join(sourceDir, "site"),
    path.join(sourceDir, "dist"),
  ];

  for (const candidate of candidates) {
    if (await exists(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  throw new Error(`No index.html found for generated test site: ${sourceDir}`);
}

function shouldSkipCopy(entryName, sourcePath) {
  return (
    entryName === ".DS_Store" ||
    entryName === ".git" ||
    entryName === ".next" ||
    entryName === "__pycache__" ||
    entryName === "node_modules"
  );
}

function replaceRootPath(text, segment, targetWithoutTrailingSlash) {
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(^|[\\s"'(=])/${escaped}(?=/|\\?|#|["'\\s>)])`, "g"),
    `$1${targetWithoutTrailingSlash}`
  );
}

function replaceRelativePath(text, segment, targetWithoutTrailingSlash) {
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(["'\`(=:])(?:\\.\\./|\\./)*${escaped}(?=/|\\?|#|["'\\s>)])`,
    "g"
  );

  return text.replace(pattern, `$1${targetWithoutTrailingSlash}`);
}

function replaceRootFilePath(text, siteBase) {
  const filePattern =
    String.raw`([="'\`(\s])\/(?!test\/|_next\/|data\/|graph\/|articles\/|leaderboard\/|assets\/|css\/|js\/|fonts\/|static\/|vendor\/|build\/)([^"'\`\s)>?#]+\.(?:js|mjs|css|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf))(?:([?#][^"'\`\s)>]*)?)`;

  return text.replace(new RegExp(filePattern, "g"), (_, prefix, filePath, suffix = "") => {
    return `${prefix}${siteBase}/${filePath}${suffix}`;
  });
}

function appendTestAssetVersion(text) {
  return text.replace(
    /\b(src|href)=(["'])(\/test\/[^"']+\.(?:js|mjs|css))(?!\?)(["'])/g,
    `$1=$2$3?v=${TEST_ASSET_VERSION}$4`
  );
}

function rewriteText(text, basePath, options = {}) {
  const siteBase = basePath.replace(/\/$/, "");
  const rootDataBase = options.hasData ? `${siteBase}/data` : "/test/data";
  const assetDataBase = options.hasAssetsData ? `${siteBase}/assets/data` : rootDataBase;

  let out = text;

  out = out.replace(/(href|action)=(["'])\/\2/g, `$1=$2${basePath}$2`);
  out = out.replace(/(["'`(=:\s])\/assets\/data\//g, `$1${assetDataBase}/`);
  out = out.replace(/(["'`(=:\s])(?:\.\.\/|\.\/)*assets\/data\//g, `$1${assetDataBase}/`);
  out = out.replace(/(["'`(=:\s])(?:\.\.\/|\.\/)*data\//g, `$1${rootDataBase}/`);

  out = replaceRelativePath(out, "graph", `${siteBase}/graph`);
  out = replaceRelativePath(out, "articles", `${siteBase}/articles`);
  out = replaceRelativePath(out, "leaderboard", siteBase);
  out = replaceRelativePath(out, "assets", `${siteBase}/assets`);
  out = replaceRelativePath(out, "css", `${siteBase}/css`);
  out = replaceRelativePath(out, "js", `${siteBase}/js`);
  out = replaceRelativePath(out, "fonts", `${siteBase}/fonts`);
  out = replaceRelativePath(out, "static", `${siteBase}/static`);
  out = replaceRelativePath(out, "vendor", `${siteBase}/vendor`);
  out = replaceRelativePath(out, "build", `${siteBase}/build`);

  out = replaceRootPath(out, "data", rootDataBase);
  out = replaceRootPath(out, "graph", `${siteBase}/graph`);
  out = replaceRootPath(out, "articles", `${siteBase}/articles`);
  out = replaceRootPath(out, "leaderboard", siteBase);
  out = replaceRootPath(out, "assets", `${siteBase}/assets`);
  out = replaceRootPath(out, "css", `${siteBase}/css`);
  out = replaceRootPath(out, "js", `${siteBase}/js`);
  out = replaceRootPath(out, "fonts", `${siteBase}/fonts`);
  out = replaceRootPath(out, "static", `${siteBase}/static`);
  out = replaceRootPath(out, "vendor", `${siteBase}/vendor`);
  out = replaceRootPath(out, "build", `${siteBase}/build`);
  out = replaceRootFilePath(out, siteBase);

  out = out.replaceAll(
    `.replace(/href="\\//g, 'href="' + prefix)`,
    `.replace(/href="\\/(?!test\\/)/g, 'href="' + prefix)`
  );

  return appendTestAssetVersion(out);
}

async function copyTree(sourceDir, destDir, basePath = null, rewriteOptions = {}) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (shouldSkipCopy(entry.name, sourcePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyTree(sourcePath, destPath, basePath, rewriteOptions);
      continue;
    }

    if (basePath && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const raw = await readFile(sourcePath, "utf8");
      await writeFile(destPath, rewriteText(raw, basePath, rewriteOptions));
      continue;
    }

    await copyFile(sourcePath, destPath);
  }
}

async function listTextFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === ".DS_Store") continue;

    if (entry.isDirectory()) {
      await listTextFiles(fullPath, acc);
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      acc.push(fullPath);
    }
  }

  return acc;
}

async function scanIsolation() {
  const files = await listTextFiles(TEST_DEST);
  const checks = [
    { name: "root graph link", pattern: /href=["']\/graph(?:\/|\?|#|["'])/ },
    { name: "root articles link", pattern: /href=["']\/articles(?:\/|\?|#|["'])/ },
    { name: "root leaderboard link", pattern: /href=["']\/leaderboard(?:\/|\?|#|["'])/ },
    { name: "root home form/link", pattern: /(href|action)=["']\/["']/ },
    { name: "root asset src", pattern: /src=["']\/(?:assets|css|js|fonts|static|vendor|build)\// },
    { name: "root data fetch", pattern: /fetch\(\s*["']\/data(?:\/|["'])/ },
    { name: "root asset css url", pattern: /url\(\s*["']?\/(?:assets|css|js|fonts|static|vendor|build)\// },
    { name: "duplicated relative test path", pattern: /(?:href|src|action)=["'](?:\.\.\/|\.\/)+test\// },
    { name: "rewritten JavaScript identifier", pattern: /\b(?:const|let|var|function)\s+\/test\// },
    { name: "runtime root href prefixer", pattern: /\.replace\(\s*\/href="\\\/\/g,\s*["']href=/ },
  ];
  const violations = [];

  for (const file of files) {
    if (file.includes(`${path.sep}data${path.sep}`)) continue;
    const raw = await readFile(file, "utf8");

    for (const check of checks) {
      const match = raw.match(check.pattern);
      if (match) {
        violations.push({
          file: path.relative(SITE_DIR, file),
          check: check.name,
          match: match[0],
        });
      }
    }
  }

  if (violations.length) {
    const detail = violations
      .slice(0, 30)
      .map((item) => `${item.file}: ${item.check}: ${item.match}`)
      .join("\n");
    throw new Error(`Test site isolation scan failed:\n${detail}`);
  }
}

function roundNumber(round) {
  return Number(round.replace(/^r/, ""));
}

function gradeForPending(score) {
  if (!Number.isFinite(score)) return "待复测";
  if (score >= 92) return "A";
  if (score >= 88) return "A-";
  if (score >= 82) return "B+";
  if (score >= 75) return "B";
  if (score >= 68) return "C+";
  if (score >= 60) return "C";
  return "D";
}

function createEntry({ round, model, siteRoot, score }) {
  const href = `/test/${round}/${model.slug}/`;
  const pending = !score || !Number.isFinite(score.score);

  return {
    id: `${round}-${model.slug}`,
    round,
    roundNumber: roundNumber(round),
    model: model.name,
    modelVersion: model.version,
    modelTitle: model.title,
    modelIcon: model.icon,
    modelSlug: model.slug,
    href,
    sourceRef: `${round}/${model.sourceSlug || model.slug}`,
    score: pending ? null : score.score,
    grade: pending ? "待复测" : score.grade || gradeForPending(score.score),
    loading: pending ? null : score.loading,
    graph: pending ? null : score.graph,
    articles: pending ? null : score.articles,
    visual: pending ? null : score.visual,
    interaction: pending ? null : score.interaction,
    evidence: pending
      ? `${model.name} ${round} 产物已隔离上线，等待同一复合评分规则复测后填入正式得分。`
      : score.evidence,
    pending,
    crownRank: null,
    scoreSource: pending ? "pending-recheck" : score.scoreSource,
    adjustedRank: pending ? null : score.adjustedRank,
    graphWeightedRank: pending ? null : score.graphWeightedRank,
    graphWeightedScore: pending ? null : score.graphWeightedScore,
    graphWeightedGrade: pending ? null : score.graphWeightedGrade,
    graphWeightedGraph: pending ? null : score.graphWeightedGraph,
    oldGraph25: pending ? null : score.oldGraph25,
    adjustedGraph25: pending ? null : score.adjustedGraph25,
    stabilityStatus: pending ? null : score.stabilityStatus,
    observedPenaltyGraph25: pending ? null : score.observedPenaltyGraph25,
    effectivePenaltyGraph25: pending ? null : score.effectivePenaltyGraph25,
    sampleKind: pending ? null : score.sampleKind,
    avgChangedRatio: pending ? null : score.avgChangedRatio,
    avgMeanAbs: pending ? null : score.avgMeanAbs,
    maxChangedRatio: pending ? null : score.maxChangedRatio,
    maxMeanAbs: pending ? null : score.maxMeanAbs,
  };
}

function applyCrowns(entries) {
  const top = entries
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      return (
        b.score - a.score ||
        b.graph - a.graph ||
        b.visual - a.visual ||
        b.interaction - a.interaction ||
        a.roundNumber - b.roundNumber ||
        a.model.localeCompare(b.model)
      );
    })
    .slice(0, 5);

  for (const [index, entry] of top.entries()) {
    entry.crownRank = index + 1;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "待复测";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function modelAveragesFromEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!Number.isFinite(entry.score)) continue;
    if (!groups.has(entry.model)) groups.set(entry.model, []);
    groups.get(entry.model).push(entry);
  }

  return [...groups.entries()]
    .map(([model, rows]) => {
      const scores = rows.map((row) => row.score);
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return {
        model,
        version: rows[0]?.modelVersion || model,
        count: rows.length,
        avg,
        min: Math.min(...scores),
        max: Math.max(...scores),
      };
    })
    .sort((a, b) => b.avg - a.avg || a.model.localeCompare(b.model));
}

function renderLegacyPage(manifest) {
  const summaries = modelAveragesFromEntries(manifest.entries || []);
  const rows = [...(manifest.entries || [])]
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || a.roundNumber - b.roundNumber || a.model.localeCompare(b.model));
  const generatedAt = manifest.generatedAt ? new Date(manifest.generatedAt).toISOString() : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>旧 6 模型榜单 - 葬AI Benchmark</title>
  <style>
    :root { color-scheme: dark; --bg: #17131d; --panel: #f5f1e8; --ink: #17131d; --muted: #6d6078; --line: #2f2938; --gold: #facc15; }
    body { margin: 0; background: var(--bg); color: #f5f1e8; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 56px; }
    a { color: inherit; }
    .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    h1 { margin: 0 0 6px; color: #9b7de8; font-size: 24px; letter-spacing: 0; }
    p { margin: 0; color: #c7bdd1; }
    .back { border: 1px solid #5b4f68; padding: 8px 10px; text-decoration: none; font-size: 12px; }
    .panel { background: var(--panel); color: var(--ink); border: 2px solid var(--line); box-shadow: 8px 8px 0 var(--line); overflow-x: auto; margin-top: 18px; }
    table { width: 100%; min-width: 760px; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #d7cfbf; padding: 7px 10px; text-align: left; vertical-align: top; }
    th { color: #43384f; font-size: 12px; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .rank { display: inline-flex; min-width: 24px; height: 24px; align-items: center; justify-content: center; background: var(--gold); color: var(--ink); border: 1px solid var(--ink); font-weight: 700; }
    .meta { color: var(--muted); font-size: 12px; }
    .site { color: var(--ink); text-decoration: underline; text-underline-offset: 2px; }
  </style>
</head>
<body>
<main>
  <div class="top">
    <div>
      <h1>旧 6 模型榜单</h1>
      <p>追加豆包与阶跃前的 60 个站点快照。生成时间：${escapeHtml(generatedAt)}</p>
    </div>
    <a class="back" href="/test/">返回新版榜单</a>
  </div>
  <section class="panel" aria-label="模型均分">
    <table>
      <thead><tr><th class="num">排名</th><th>模型</th><th class="num">站点</th><th class="num">均分</th><th class="num">区间</th></tr></thead>
      <tbody>
        ${summaries.map((row, index) => `<tr><td class="num"><span class="rank">${index + 1}</span></td><td><strong>${escapeHtml(row.version)}</strong><div class="meta">${escapeHtml(row.model)}</div></td><td class="num">${row.count}</td><td class="num">${formatScore(row.avg)}</td><td class="num">${formatScore(row.min)}-${formatScore(row.max)}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
  </section>
  <section class="panel" aria-label="站点分数">
    <table>
      <thead><tr><th class="num">排名</th><th>站点</th><th class="num">分数</th><th>等级</th><th>证据</th></tr></thead>
      <tbody>
        ${rows.map((row, index) => `<tr><td class="num">${index + 1}</td><td><a class="site" href="${escapeHtml(row.href)}">${escapeHtml(row.round)} ${escapeHtml(row.modelVersion || row.model)}</a></td><td class="num">${formatScore(row.score)}</td><td>${escapeHtml(row.grade)}</td><td>${escapeHtml(row.evidence)}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
  </section>
</main>
</body>
</html>
`;
}

async function writeLegacySnapshot() {
  if (!(await exists(LEGACY_MANIFEST))) {
    console.warn(`skip missing legacy manifest: ${LEGACY_MANIFEST}`);
    return;
  }

  const legacyDir = path.join(TEST_DEST, "legacy-6-model");
  const manifest = JSON.parse(await readFile(LEGACY_MANIFEST, "utf8"));
  await mkdir(legacyDir, { recursive: true });
  await copyFile(LEGACY_MANIFEST, path.join(legacyDir, "manifest.json"));
  await copyPublicArtifact(LEGACY_SCORE_CSV, path.join(legacyDir, "playwright-recheck-graphweighted.csv"));
  await copyPublicArtifact(LEGACY_SCORE_JSON, path.join(legacyDir, "playwright-recheck-graphweighted.json"));
  await copyPublicArtifact(LEGACY_SCORE_REPORT, path.join(legacyDir, "playwright-recheck-graphweighted.md"));
  await writeFile(path.join(legacyDir, "index.html"), renderLegacyPage(manifest));
}

async function main() {
  invariant(await exists(SOURCE_ROOT), `TEST_SOURCE_ROOT does not exist: ${SOURCE_ROOT}`);
  invariant(
    await exists(TEST_SHARED_DATA_DIR),
    `Frozen /test shared data does not exist: ${TEST_SHARED_DATA_DIR}`
  );
  await validateFrozenTestData(TEST_SHARED_DATA_DIR);

  const expectedEntries = MODELS.length * 10;
  const scores = await readScores();
  invariant(scores.size === expectedEntries, `Expected ${expectedEntries} composite scores, got ${scores.size}`);
  const modelScoreStats = buildModelScoreStats(scores);
  const efficiencyLeaderboard = await readEfficiencyLeaderboard(modelScoreStats);
  invariant(
    efficiencyLeaderboard.length === MODELS.length,
    `Expected ${MODELS.length} efficiency rows, got ${efficiencyLeaderboard.length}`
  );
  const entries = [];

  await rm(TEST_DEST, { recursive: true, force: true });
  await mkdir(TEST_DEST, { recursive: true });
  await copyTree(TEST_SHARED_DATA_DIR, path.join(TEST_DEST, "data"));
  await copyPublicArtifact(SCORE_CSV, path.join(TEST_DEST, "playwright-recheck-composite.csv"));
  await copyPublicArtifact(SCORE_JSON, path.join(TEST_DEST, "playwright-recheck-composite.json"));
  await copyPublicArtifact(SCORE_REPORT, path.join(TEST_DEST, "playwright-recheck-composite.md"));
  await copyPublicArtifact(GRAPHWEIGHTED_SCORE_CSV, path.join(TEST_DEST, "playwright-recheck-graphweighted.csv"));
  await copyPublicArtifact(GRAPHWEIGHTED_SCORE_JSON, path.join(TEST_DEST, "playwright-recheck-graphweighted.json"));
  await copyPublicArtifact(GRAPHWEIGHTED_SCORE_REPORT, path.join(TEST_DEST, "playwright-recheck-graphweighted.md"));
  await writePublicAnalysisArtifacts();

  for (let round = 1; round <= 10; round += 1) {
    const roundId = `r${round}`;

    for (const model of MODELS) {
      const sourceDir = path.join(SOURCE_ROOT, roundId, model.sourceSlug || model.slug);
      const siteRoot = await detectSiteRoot(sourceDir);
      const destDir = path.join(TEST_DEST, roundId, model.slug);
      const basePath = `/test/${roundId}/${model.slug}/`;
      const rewriteOptions = {
        hasData: await exists(path.join(siteRoot, "data")),
        hasAssetsData: await exists(path.join(siteRoot, "assets", "data")),
      };

      await copyTree(siteRoot, destDir, basePath, rewriteOptions);
      entries.push(
        createEntry({
          round: roundId,
          model,
          siteRoot,
          score: scores.get(`${roundId}:${model.name}`),
        })
      );
    }
  }

  invariant(entries.length === expectedEntries, `Expected ${expectedEntries} test entries, got ${entries.length}`);
  applyCrowns(entries);

  const manifest = {
    generatedAt: new Date().toISOString(),
    snapshotDate: "2026-06-15",
    dataVersion: TEST_DATA_VERSION,
    repoUrl: TEST_METHOD_REPO_URL,
    methodologyUrl: TEST_METHODOLOGY_URL,
    scoreCsvUrl: TEST_SCORE_CSV_URL,
    scoreJsonUrl: TEST_SCORE_JSON_URL,
    reportUrl: TEST_REPORT_URL,
    graphWeightedScoreCsvUrl: TEST_GRAPHWEIGHTED_CSV_URL,
    graphWeightedScoreJsonUrl: TEST_GRAPHWEIGHTED_JSON_URL,
    graphWeightedReportUrl: TEST_GRAPHWEIGHTED_REPORT_URL,
    modelLogAnalysisUrl: TEST_MODEL_LOG_ANALYSIS_URL,
    efficiencyCsvUrl: TEST_EFFICIENCY_CSV_URL,
    runnerPolicy:
      "Models, providers, and runners are separate. opencode, Claude Code, pai, and custom commands are execution shells as long as they run the same task in isolated rounds.",
    scoreFormula: TEST_SCORE_FORMULA,
    limitations: [
      "This leaderboard only describes the FuneralAI Web4 website-rebuild task.",
      "It is not a general model capability ranking.",
      "Scores depend on the task prompt, data snapshot, runner behavior, and browser audit rules.",
      "Generated sites are hosted under /test/; the open repository publishes methods and summarized evidence, not every full artifact.",
      "The old graph-weighted score files remain published as archive evidence; the default leaderboard uses composite stability-adjusted scores.",
    ],
    sharedDataPath: "/test/data/",
    scoreStandard: SCORE_STANDARD,
    expectedEntries,
    efficiencyLeaderboard,
    entries,
  };

  await writeFile(path.join(TEST_DEST, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeLegacySnapshot();
  await scanIsolation();

  const scored = entries.filter((entry) => Number.isFinite(entry.score)).length;
  const pending = entries.length - scored;
  console.log(`Staged ${entries.length} test sites (${scored} scored, ${pending} pending) in ${TEST_DEST}`);
}

async function copyPublicArtifact(source, destination) {
  if (!(await exists(source))) {
    console.warn(`skip missing public artifact: ${source}`);
    return;
  }

  await copyFile(source, destination);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
