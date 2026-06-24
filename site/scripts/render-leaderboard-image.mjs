import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.dirname(SCRIPT_DIR);
const OUT_DIR = path.join(SITE_DIR, "out");
const PUBLIC_TEST_DIR = path.join(SITE_DIR, "public", "test");
const LEADERBOARD_IMAGES = [
  {
    label: "model leaderboard",
    selector: "[data-leaderboard-export]",
    fileName: "model-leaderboard-mobile.png",
    waitForLogo: true,
  },
  {
    label: "value leaderboard",
    selector: "[data-value-leaderboard-export]",
    fileName: "value-leaderboard-mobile.png",
    waitForLogo: true,
  },
];
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MIN_IMAGE_BYTES = 20_000;

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function existingFile(candidate) {
  try {
    const info = await stat(candidate);
    return info.isFile();
  } catch {
    return false;
  }
}

async function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const cleanPath = path
    .normalize(decodedPath)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^\/+/, "");
  const candidate = path.join(OUT_DIR, cleanPath);

  if ((await existingFile(candidate)) && candidate.startsWith(OUT_DIR)) {
    return candidate;
  }

  const indexCandidate = path.join(candidate, "index.html");
  if ((await existingFile(indexCandidate)) && indexCandidate.startsWith(OUT_DIR)) {
    return indexCandidate;
  }

  const htmlCandidate = `${candidate}.html`;
  if ((await existingFile(htmlCandidate)) && htmlCandidate.startsWith(OUT_DIR)) {
    return htmlCandidate;
  }

  return null;
}

function createStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = await resolveRequestPath(request.url || "/");

      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const mimeType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
      response.writeHead(200, { "content-type": mimeType });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Internal error");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      invariant(address && typeof address === "object", "Could not start static server");
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
      });
    });
  });
}

async function launchChrome() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

  if (executablePath) {
    return chromium.launch({ headless: true, executablePath });
  }

  const channels = [
    process.env.PLAYWRIGHT_CHROME_CHANNEL,
    "chrome",
  ].filter(Boolean);

  for (const channel of channels) {
    try {
      return await chromium.launch({ headless: true, channel });
    } catch {
      // Try the next configured browser.
    }
  }

  return chromium.launch({ headless: true });
}

async function validatePng(filePath) {
  const info = await stat(filePath);
  invariant(info.size >= MIN_IMAGE_BYTES, `Generated leaderboard image is too small: ${info.size} bytes`);

  const signature = await readFile(filePath, { encoding: null });
  invariant(
    signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47,
    `Generated leaderboard image is not a PNG: ${filePath}`
  );
}

async function renderLeaderboardImage(page, origin, imageConfig) {
  await page.goto(`${origin}/test/`, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: `
      html,
      body {
        background: #100d14 !important;
      }

      nav.sticky,
      [data-export-ignore] {
        display: none !important;
      }

      ${imageConfig.selector} {
        box-sizing: content-box !important;
        margin-left: -16px !important;
        margin-right: -16px !important;
        padding: 12px 16px 16px !important;
        background: #100d14 !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts?.ready);

  const target = page.locator(imageConfig.selector);
  await target.waitFor({ state: "visible", timeout: 15_000 });

  if (imageConfig.waitForLogo) {
    await page.locator(`${imageConfig.selector} img[alt="葬AI"]`).waitFor({ state: "visible", timeout: 15_000 });
  }

  const outImagePath = path.join(OUT_DIR, "test", imageConfig.fileName);
  const publicImagePath = path.join(PUBLIC_TEST_DIR, imageConfig.fileName);
  await mkdir(path.dirname(outImagePath), { recursive: true });
  await target.screenshot({
    path: outImagePath,
    animations: "disabled",
  });
  await validatePng(outImagePath);

  await mkdir(PUBLIC_TEST_DIR, { recursive: true });
  await copyFile(outImagePath, publicImagePath);
  console.log(`Rendered mobile ${imageConfig.label} image: ${outImagePath}`);
}

async function main() {
  invariant(await existingFile(path.join(OUT_DIR, "test", "index.html")), "Run next build before rendering the leaderboard image");

  const server = await createStaticServer();
  let browser;

  try {
    browser = await launchChrome();
    const page = await browser.newPage({
      viewport: MOBILE_VIEWPORT,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    for (const imageConfig of LEADERBOARD_IMAGES) {
      await renderLeaderboardImage(page, server.origin, imageConfig);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    await server.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
