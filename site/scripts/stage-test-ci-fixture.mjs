#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, '..');
const destination = path.join(siteDir, 'public', 'test');

if (process.env.CI !== 'true' && process.env.ALLOW_CI_FIXTURE !== '1') {
  throw new Error('CI benchmark fixture is only allowed with CI=true or ALLOW_CI_FIXTURE=1');
}

const models = Array.from({ length: 16 }, (_, index) => {
  const rank = index + 1;
  return {
    tier: rank <= 2 ? 'S' : rank <= 5 ? 'A' : rank <= 9 ? 'B' : rank <= 13 ? 'C' : 'D',
    model_id: `ci/model-${rank}`,
    model: `CI Model ${rank}`,
    slug: `ci-model-${rank}`,
    icon: ['diamond', 'moon', 'grid', 'spark', 'bolt', 'crystal'][index % 6],
    score_mean: 80 - index * 3,
    score_median: 80 - index * 3,
    avg_wall_minutes: 5 + index / 10,
    api_calls_10_tasks: 100 + index,
    cost_cny_10_tasks: 10 + index,
    cost_basis: 'ci_fixture',
  };
});

const entries = models.flatMap((model, modelIndex) =>
  Array.from({ length: 10 }, (_, roundIndex) => {
    const round = roundIndex + 1;
    const score = model.score_mean + ((roundIndex % 3) - 1);
    return {
      id: `r${String(round).padStart(2, '0')}-${model.slug}`,
      round: `r${round}`,
      roundNumber: round,
      model: model.model,
      modelId: model.model_id,
      modelVersion: model.model,
      modelTitle: model.model,
      modelIcon: model.icon,
      modelSlug: model.slug,
      href: `/test/ci-fixture/r${round}/${model.slug}/viewer/`,
      rawArchiveHref: `/test/ci-fixture/r${round}/${model.slug}/raw.tar.gz`,
      score,
      grade: score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D',
      evidence: 'compile-only CI fixture',
      pending: false,
      crownRank: null,
      state: 'done',
      scorerVersion: 'ci',
      sourceTreeSha256: '0'.repeat(64),
      sourceFileCount: 1,
      sourceBytes: 1024 + modelIndex,
      rawArchiveSha256: '1'.repeat(64),
      rawArchiveBytes: 512 + roundIndex,
    };
  })
);

const valueLeaderboard = models.map((model, index) => ({
  rank: index + 1,
  model_id: model.model_id,
  model: model.model,
  slug: model.slug,
  icon: model.icon,
  value_index: 100 - index,
  score_mean: model.score_mean,
  cost_cny_10_tasks: model.cost_cny_10_tasks,
  avg_wall_minutes: model.avg_wall_minutes,
  api_calls_10_tasks: model.api_calls_10_tasks,
  cost_basis: model.cost_basis,
}));

const manifest = {
  schemaVersion: 'graph-v2-ci-fixture/1',
  releaseId: 'graph-v2-ci-compile-fixture',
  generatedAt: '2026-07-28T00:00:00Z',
  sourceGeneratedAt: '2026-07-28T00:00:00Z',
  snapshotDate: '2026-07-28',
  dataVersion: 'ci-compile-only',
  scoreStandard: 'ci-compile-only',
  expectedEntries: entries.length,
  pricingAsOf: '2026-07-28',
  fxCnyPerUsd: 7,
  scope: 'Compile-only deterministic fixture; never deploy to production.',
  runnerPolicy: 'No benchmark was executed.',
  repoUrl: 'https://github.com/FrichXi/funeralai-web4',
  methodologyUrl: '/test/methodology/',
  scoreCsvUrl: '/test/ci-fixture/scores.csv',
  scoreJsonUrl: '/test/ci-fixture/scores.json',
  reportUrl: '/test/methodology/',
  archiveUrl: '/test/archive/',
  scoreFormula: 'CI fixture only',
  limitations: ['This manifest only proves the frontend compiles in a clean checkout.'],
  officialTasks: [],
  valueFormula: {
    consumption_rank: 'CI fixture only',
    value_index: 'CI fixture only',
    unpriced_models_excluded: [],
  },
  engineeringLeaderboard: models,
  valueLeaderboard,
  entries,
};

const legacyModels = models.slice(0, 8);
const legacyEntries = legacyModels.flatMap((model) =>
  Array.from({ length: 10 }, (_, roundIndex) => ({
    round: `r${roundIndex + 1}`,
    roundNumber: roundIndex + 1,
    model: model.model,
    modelVersion: model.model,
    href: `/test/ci-fixture/legacy/r${roundIndex + 1}/${model.slug}/`,
    score: model.score_mean,
    grade: 'CI',
  }))
);

const legacyManifest = {
  generatedAt: '2026-07-28T00:00:00Z',
  snapshotDate: '2026-07-28',
  dataVersion: 'ci-compile-only',
  scoreStandard: 'ci-compile-only',
  expectedEntries: legacyEntries.length,
  entries: legacyEntries,
};

const releaseSummary = {
  entries: entries.length,
  sourceFiles: entries.length,
  sourceBytes: entries.reduce((sum, entry) => sum + entry.sourceBytes, 0),
  archiveBytes: entries.reduce((sum, entry) => sum + entry.rawArchiveBytes, 0),
};

await rm(destination, { recursive: true, force: true });
await mkdir(path.join(destination, 'archive', '2026-06-24-web4-rebuild'), { recursive: true });
await writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(destination, 'release-summary.json'), `${JSON.stringify(releaseSummary, null, 2)}\n`);
await writeFile(
  path.join(destination, 'archive', '2026-06-24-web4-rebuild', 'manifest.json'),
  `${JSON.stringify(legacyManifest, null, 2)}\n`
);
console.log(`Staged deterministic CI benchmark fixture: ${entries.length}/${entries.length}`);
