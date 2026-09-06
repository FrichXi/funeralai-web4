// Downloads are immutable release assets already versioned with their hashes.
// A content build must not launch a browser or regenerate unrelated benchmark art.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(await readFile(path.join(site, "src/data/web4-benchmark-current.json"), "utf8"));
await mkdir(path.join(site, "out/test"), { recursive: true });
for (const [key, filename] of [
  ["modelLeaderboardImage", "model-leaderboard.png"],
  ["valueLeaderboardImage", "value-leaderboard.png"],
]) {
  await copyFile(path.join(site, "public", release.assets[key]), path.join(site, "out/test", filename));
}
console.log("Copied frozen leaderboard downloads.");
