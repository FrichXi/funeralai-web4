import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.dirname(SCRIPT_DIR);
const PUBLIC_TEST = path.join(SITE_DIR, "public", "test");
const CANDIDATE = path.join(SITE_DIR, ".stage-test-candidate-graph-v2");
const TRASH_ROOT = path.join(SITE_DIR, ".stage-test-trash");
const BENCHMARK_ROOT =
  process.env.GRAPH_V2_BENCHMARK_ROOT || "/Users/xixiangyu/dev/zangai-bench-v2";
const ANALYSIS_DIR = path.join(
  BENCHMARK_ROOT,
  "analysis",
  "graph-v2-full-20260718"
);
const LEADERBOARD_JSON = path.join(ANALYSIS_DIR, "public-leaderboards.json");
const ATTEMPTS_CSV = path.join(ANALYSIS_DIR, "current_attempts.csv");
const RELEASE_ID = "web4-graph-v2-first-official";
const ARTIFACT_ROOT = path.join(CANDIDATE, "artifacts", RELEASE_ID);
const ARCHIVE_ID = "2026-06-24-web4-rebuild";
const ACTIVATE = process.argv.includes("--activate");
const VERIFY_CURRENT = process.argv.includes("--verify-current");

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".htm",
  ".js",
  ".json",
  ".mjs",
  ".svg",
  ".txt",
  ".xml",
]);
const VIEWER_SKIP = new Set([
  ".git",
  ".next",
  ".cache",
  ".npm",
  "__pycache__",
  "node_modules",
]);
const ICONS = ["diamond", "moon", "grid", "spark", "bolt", "crystal"];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...values] = rows;
  invariant(headers?.length, "Attempts CSV is empty");
  return values.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ""), cells[index] ?? ""]))
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "model";
}

function scoreTier(score) {
  if (score >= 60) return "S";
  if (score >= 50) return "A";
  if (score >= 40) return "B";
  if (score >= 30) return "C";
  if (score >= 20) return "D";
  return "E";
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function rounded(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function sameRoundedNumber(actual, expected, digits = 2) {
  return Math.abs(Number(actual) - Number(expected)) <= 10 ** -digits + Number.EPSILON;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const buffer = await readFile(filePath);
  hash.update(buffer);
  return hash.digest("hex");
}

async function verifyCurrentTree() {
  const manifestPath = path.join(PUBLIC_TEST, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  invariant(manifest.releaseId === RELEASE_ID, `Unexpected /test release: ${manifest.releaseId}`);
  invariant(manifest.entries?.length === 160, `Expected 160 current entries, got ${manifest.entries?.length}`);
  invariant(manifest.engineeringLeaderboard?.length === 16, "Expected 16 engineering rows");
  invariant(manifest.valueLeaderboard?.length === 15, "Expected 15 value rows");
  invariant(new Set(manifest.entries.map((entry) => entry.id)).size === 160, "Current entry ids are not unique");
  for (const entry of manifest.entries) {
    const archive = path.join(PUBLIC_TEST, entry.rawArchiveHref.replace(/^\/test\//, ""));
    const viewer = path.join(PUBLIC_TEST, entry.href.replace(/^\/test\//, ""), "index.html");
    invariant(await exists(archive), `Missing raw archive: ${entry.id}`);
    invariant(await exists(viewer), `Missing viewer entrypoint: ${entry.id}`);
    invariant(await sha256File(archive) === entry.rawArchiveSha256, `Raw archive hash mismatch: ${entry.id}`);
  }
  invariant(
    await exists(path.join(PUBLIC_TEST, "archive", ARCHIVE_ID, "manifest.json")),
    "Missing previous leaderboard archive manifest"
  );
  if (await exists(LEADERBOARD_JSON)) {
    invariant(
      await sha256File(path.join(PUBLIC_TEST, "public-leaderboards.json")) === await sha256File(LEADERBOARD_JSON),
      "Published leaderboard JSON differs from the frozen benchmark input"
    );
  }
  console.log(`verified current /test release: ${RELEASE_ID} (${manifest.entries.length} entries)`);
}

async function treeInventory(root, relative = "", output = []) {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const rel = path.posix.join(relative.split(path.sep).join(path.posix.sep), entry.name);
    const absolute = path.join(root, rel);
    const info = await lstat(absolute);
    if (entry.isDirectory()) {
      output.push({ type: "directory", path: `${rel}/`, bytes: 0 });
      await treeInventory(root, rel, output);
    } else if (entry.isSymbolicLink()) {
      output.push({ type: "symlink", path: rel, target: await readlink(absolute), bytes: 0 });
    } else if (entry.isFile()) {
      output.push({ type: "file", path: rel, bytes: info.size, sha256: await sha256File(absolute) });
    }
  }
  return output;
}

function inventoryDigest(inventory) {
  return createHash("sha256").update(JSON.stringify(inventory)).digest("hex");
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
    `(["'\`])(?:\\.\\./|\\./)*${escaped}(?=/|\\?|#|["'\`])`,
    "g"
  );
  return text.replace(pattern, `$1${targetWithoutTrailingSlash}`);
}

function rewriteText(text, basePath, options) {
  const siteBase = basePath.replace(/\/$/, "");
  const rootDataBase = options.hasData ? `${siteBase}/data` : "/test/data";
  const assetDataBase = options.hasAssetsData ? `${siteBase}/assets/data` : rootDataBase;
  let output = text;
  output = output.replace(/(href|action)=(["'])\/\2/g, `$1=$2${basePath}$2`);
  output = output.replace(/(["'`(=:\s])\/assets\/data\//g, `$1${assetDataBase}/`);
  output = output.replace(/(["'`(=:\s])(?:\.\.\/|\.\/)*assets\/data\//g, `$1${assetDataBase}/`);
  output = output.replace(/(["'`(=:\s])(?:\.\.\/|\.\/)*data\//g, `$1${rootDataBase}/`);
  for (const segment of ["graph", "articles", "assets", "css", "js", "fonts", "static", "vendor", "build"]) {
    output = replaceRelativePath(output, segment, `${siteBase}/${segment}`);
    output = replaceRootPath(output, segment, `${siteBase}/${segment}`);
  }
  output = replaceRootPath(output, "data", rootDataBase);
  output = replaceRootPath(output, "leaderboard", siteBase);
  return output;
}

async function copyViewerTree(source, destination, basePath) {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (VIEWER_SKIP.has(entry.name) || entry.name === ".DS_Store") continue;
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyViewerTree(sourcePath, destinationPath, basePath);
    } else if (entry.isSymbolicLink()) {
      continue;
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const raw = await readFile(sourcePath, "utf8");
      const options = {
        hasData: await exists(path.join(source, "data")),
        hasAssetsData: await exists(path.join(source, "assets", "data")),
      };
      await writeFile(destinationPath, rewriteText(raw, basePath, options));
    } else {
      await copyFile(sourcePath, destinationPath);
    }
  }
}

function metadataPage(entry, archiveHref) {
  const title = `${entry.display} · r${entry.round}`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{margin:0;background:#17131d;color:#f5f1e8;font:16px/1.7 ui-monospace,monospace}.card{max-width:720px;margin:10vh auto;padding:32px;border:2px solid #7351cf;box-shadow:8px 8px 0 #7351cf}a{color:#c4b5fd}code{color:#facc15}</style></head>
<body><main class="card"><h1>${title}</h1><p>该任务的原始交付目录没有 HTML 入口；所有文件仍已完整保存在原始归档中。</p>
<p>状态：<code>${entry.state}</code> · 得分：<code>${Number(entry.score).toFixed(2)}</code> · scorer：<code>${entry.scorer_version}</code></p>
<p><a href="${archiveHref}">下载完整原始产物（tar.gz）</a></p></main></body></html>`;
}

async function createRawArchive(source, destination) {
  await execFileAsync("tar", ["-czf", destination, "-C", source, "."], { maxBuffer: 10 * 1024 * 1024 });
  await execFileAsync("tar", ["-tzf", destination], { maxBuffer: 50 * 1024 * 1024 });
}

async function archivePreviousBenchmark() {
  const manifestPath = path.join(CANDIDATE, "manifest.json");
  if (!(await exists(manifestPath))) return;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.releaseId === RELEASE_ID) return;
  const archiveDir = path.join(CANDIDATE, "archive", ARCHIVE_ID);
  await mkdir(archiveDir, { recursive: true });
  await copyFile(manifestPath, path.join(archiveDir, "manifest.json"));
  for (const name of [
    "cross-model-comparison.csv",
    "model-log-analysis.md",
    "playwright-recheck-composite.csv",
    "playwright-recheck-composite.json",
    "playwright-recheck-composite.md",
    "playwright-recheck-graphweighted.csv",
    "playwright-recheck-graphweighted.json",
    "playwright-recheck-graphweighted.md",
  ]) {
    const source = path.join(CANDIDATE, name);
    if (await exists(source)) await copyFile(source, path.join(archiveDir, name));
  }
}

function validateInputs(rows, leaderboard) {
  invariant(leaderboard.schema_version === "1.3", `Expected schema 1.3, got ${leaderboard.schema_version}`);
  invariant(!("qwen_kimi_comparison" in leaderboard), "Stability comparison must not be published");
  invariant(!("qwen_kimi_history" in leaderboard), "Stability history must not be published");
  invariant(rows.length === 160, `Expected 160 attempts, got ${rows.length}`);
  invariant(rows.every((row) => row.selected === "True"), "Every published attempt must be selected");

  const groups = new Map();
  const unique = new Set();
  for (const row of rows) {
    const key = `${row.model}:r${Number(row.round)}`;
    invariant(!unique.has(key), `Duplicate model/round mapping: ${key}`);
    unique.add(key);
    if (!groups.has(row.model)) groups.set(row.model, []);
    groups.get(row.model).push(row);
  }
  invariant(groups.size === 16, `Expected 16 models, got ${groups.size}`);
  invariant([...groups.values()].every((items) => items.length === 10), "Every model must have 10 attempts");
  invariant(leaderboard.engineering_leaderboard.length === 16, "Engineering leaderboard must have 16 rows");
  invariant(leaderboard.value_leaderboard.length === 15, "Value leaderboard must have 15 rows");

  const engineering = new Map(leaderboard.engineering_leaderboard.map((row) => [row.model_id, row]));
  for (const [model, items] of groups) {
    const target = engineering.get(model);
    invariant(target, `Missing engineering row for ${model}`);
    const scores = items.map((row) => Number(row.score || 0));
    const walls = items.map((row) => Number(row.wall_seconds || 0));
    const calls = items.reduce((sum, row) => sum + Number(row.api_calls || 0), 0);
    const cost = items.reduce((sum, row) => sum + Number(row.cost_cny || 0), 0);
    invariant(sameRoundedNumber(target.score_mean, rounded(mean(scores))), `Mean mismatch for ${model}`);
    invariant(sameRoundedNumber(target.score_median, rounded(median(scores))), `Median mismatch for ${model}`);
    invariant(sameRoundedNumber(target.avg_wall_minutes, rounded(mean(walls) / 60)), `Wall-time mismatch for ${model}`);
    invariant(target.api_calls_10_tasks === calls, `API-call mismatch for ${model}`);
    if (target.cost_cny_10_tasks !== null) {
      invariant(sameRoundedNumber(target.cost_cny_10_tasks, rounded(cost, 3), 3), `Cost mismatch for ${model}`);
    }
  }
}

async function stage() {
  const [leaderboardRaw, attemptsRaw] = await Promise.all([
    readFile(LEADERBOARD_JSON, "utf8"),
    readFile(ATTEMPTS_CSV, "utf8"),
  ]);
  const leaderboard = JSON.parse(leaderboardRaw);
  const rows = parseCsv(attemptsRaw);
  validateInputs(rows, leaderboard);

  await rm(CANDIDATE, { recursive: true, force: true });
  await cp(PUBLIC_TEST, CANDIDATE, { recursive: true, preserveTimestamps: true });
  await archivePreviousBenchmark();
  await rm(ARTIFACT_ROOT, { recursive: true, force: true });
  await mkdir(ARTIFACT_ROOT, { recursive: true });

  const orderedModels = leaderboard.engineering_leaderboard.map((row, index) => ({
    ...row,
    slug: slugify(row.model),
    icon: ICONS[index % ICONS.length],
  }));
  const modelMetadata = new Map(orderedModels.map((row) => [row.model_id, row]));
  const entries = [];
  const audit = [];

  for (const row of [...rows].sort((a, b) => Number(a.round) - Number(b.round) || a.display.localeCompare(b.display))) {
    const model = modelMetadata.get(row.model);
    invariant(model, `No public model metadata for ${row.model}`);
    const attemptDir = row.attempt_dir;
    const workDir = path.join(attemptDir, "work");
    const slot = JSON.parse(await readFile(path.join(attemptDir, "slot.json"), "utf8"));
    invariant(slot.model === row.model, `slot.json model mismatch: ${attemptDir}`);
    invariant(Number(slot.round) === Number(row.round), `slot.json round mismatch: ${attemptDir}`);
    invariant(await exists(workDir), `Missing work directory: ${workDir}`);

    const roundId = `r${String(Number(row.round)).padStart(2, "0")}`;
    const relativeRoot = `artifacts/${RELEASE_ID}/${roundId}/${model.slug}`;
    const destinationRoot = path.join(CANDIDATE, relativeRoot);
    const viewerDir = path.join(destinationRoot, "viewer");
    const rawArchive = path.join(destinationRoot, "raw.tar.gz");
    const viewerBase = `/test/${relativeRoot}/viewer/`;
    const rawArchiveHref = `/test/${relativeRoot}/raw.tar.gz`;
    await mkdir(destinationRoot, { recursive: true });

    const inventory = await treeInventory(workDir);
    const treeSha256 = inventoryDigest(inventory);
    await createRawArchive(workDir, rawArchive);
    await copyViewerTree(workDir, viewerDir, viewerBase);

    let entryHtml = "";
    if (await exists(path.join(viewerDir, "index.html"))) {
      entryHtml = "index.html";
    } else {
      const htmlFiles = inventory
        .filter((item) => item.type === "file" && /\.html?$/i.test(item.path))
        .map((item) => item.path)
        .sort();
      if (htmlFiles.length) {
        entryHtml = htmlFiles[0];
        await copyFile(path.join(viewerDir, entryHtml), path.join(viewerDir, "index.html"));
      } else {
        await writeFile(path.join(viewerDir, "index.html"), metadataPage(row, rawArchiveHref));
      }
    }

    const fileCount = inventory.filter((item) => item.type === "file").length;
    const sourceBytes = inventory.reduce((sum, item) => sum + (item.bytes || 0), 0);
    const archiveInfo = await stat(rawArchive);
    const rawArchiveSha256 = await sha256File(rawArchive);
    const entry = {
      id: `${roundId}-${model.slug}`,
      round: `r${Number(row.round)}`,
      roundNumber: Number(row.round),
      model: row.display,
      modelId: row.model,
      modelVersion: row.display,
      modelTitle: row.display,
      modelIcon: model.icon,
      modelSlug: model.slug,
      href: viewerBase,
      rawArchiveHref,
      score: Number(row.score),
      grade: scoreTier(Number(row.score)),
      evidence: `state=${row.state}; scorer=${row.scorer_version}; task_success=${row.task_success}`,
      pending: false,
      crownRank: null,
      state: row.state,
      scorerVersion: row.scorer_version,
      sourceTreeSha256: treeSha256,
      sourceFileCount: fileCount,
      sourceBytes,
      rawArchiveSha256,
      rawArchiveBytes: archiveInfo.size,
    };
    entries.push(entry);
    audit.push({
      id: entry.id,
      modelId: row.model,
      model: row.display,
      round: Number(row.round),
      cohort: row.cohort,
      attempt: path.basename(attemptDir),
      state: row.state,
      score: Number(row.score),
      scorerVersion: row.scorer_version,
      sourceTreeSha256: treeSha256,
      sourceFileCount: fileCount,
      sourceBytes,
      rawArchiveHref,
      rawArchiveSha256,
      rawArchiveBytes: archiveInfo.size,
      viewerEntrypoint: entryHtml || "generated metadata page",
    });
    console.log(`staged ${entry.id} score=${entry.score.toFixed(2)} files=${fileCount}`);
  }

  invariant(entries.length === 160, `Expected 160 staged entries, got ${entries.length}`);
  const manifest = {
    schemaVersion: "2.0",
    releaseId: RELEASE_ID,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: leaderboard.generated_at,
    snapshotDate: "2026-07-18",
    dataVersion: `graph-v2-first-official-schema-${leaderboard.schema_version}`,
    scoreStandard: "graph-v2-scorer-3.1-first-official",
    expectedEntries: 160,
    officialTasks: leaderboard.official_tasks,
    pricingAsOf: leaderboard.pricing_as_of,
    fxCnyPerUsd: leaderboard.fx_cny_per_usd,
    scope: leaderboard.scope,
    repoUrl: "https://github.com/FrichXi/personal-work-benchmark",
    methodologyUrl: "/test/methodology/",
    scoreCsvUrl: "/test/leaderboard-engineering.csv",
    scoreJsonUrl: "/test/public-leaderboards.json",
    reportUrl: "/test/PUBLIC-LEADERBOARDS.md",
    archiveUrl: "/test/archive/",
    runnerPolicy: "Models, providers, and runners are recorded separately; every public row is pinned to one audited attempt.",
    scoreFormula: "模型总榜不做精确排名；按 10 分区间划分 S–E 档位。",
    valueFormula: leaderboard.value_method,
    limitations: [
      "结果只代表本次 Web4 复杂个人网站工程任务，不是通用模型能力排名。",
      "失败任务产生的调用、token、耗时和费用仍计入工程消耗。",
      "Qwen 3.8 暂无可换算的公开按 token API 单价，因此不参与性价比排名。",
    ],
    engineeringLeaderboard: orderedModels,
    valueLeaderboard: leaderboard.value_leaderboard.map((row) => ({
      ...row,
      slug: modelMetadata.get(row.model_id)?.slug || slugify(row.model),
      icon: modelMetadata.get(row.model_id)?.icon || "diamond",
    })),
    entries,
  };

  await Promise.all([
    writeFile(path.join(CANDIDATE, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(CANDIDATE, "artifact-audit.json"), `${JSON.stringify({ releaseId: RELEASE_ID, entries: audit }, null, 2)}\n`),
    copyFile(LEADERBOARD_JSON, path.join(CANDIDATE, "public-leaderboards.json")),
    copyFile(path.join(ANALYSIS_DIR, "PUBLIC-LEADERBOARDS.md"), path.join(CANDIDATE, "PUBLIC-LEADERBOARDS.md")),
    copyFile(path.join(ANALYSIS_DIR, "leaderboard-engineering.csv"), path.join(CANDIDATE, "leaderboard-engineering.csv")),
    copyFile(path.join(ANALYSIS_DIR, "leaderboard-value.csv"), path.join(CANDIDATE, "leaderboard-value.csv")),
  ]);

  const aggregate = {
    entries: audit.length,
    sourceFiles: audit.reduce((sum, row) => sum + row.sourceFileCount, 0),
    sourceBytes: audit.reduce((sum, row) => sum + row.sourceBytes, 0),
    archiveBytes: audit.reduce((sum, row) => sum + row.rawArchiveBytes, 0),
  };
  await writeFile(path.join(CANDIDATE, "release-summary.json"), `${JSON.stringify(aggregate, null, 2)}\n`);
  console.log(`candidate ready: ${CANDIDATE}`);
  console.log(JSON.stringify(aggregate));

  if (ACTIVATE) {
    await mkdir(TRASH_ROOT, { recursive: true });
    const previous = path.join(TRASH_ROOT, `test-before-${RELEASE_ID}-${new Date().toISOString().replaceAll(":", "-")}`);
    await rename(PUBLIC_TEST, previous);
    try {
      await rename(CANDIDATE, PUBLIC_TEST);
    } catch (error) {
      await rename(previous, PUBLIC_TEST);
      throw error;
    }
    console.log(`activated candidate; previous test tree retained at ${previous}`);
  }
}

if (VERIFY_CURRENT) {
  await verifyCurrentTree();
} else {
  await stage();
}
