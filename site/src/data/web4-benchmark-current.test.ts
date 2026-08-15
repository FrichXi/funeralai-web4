import { describe, expect, it } from 'vitest';
import benchmark from './web4-benchmark-current.json';
import { benchmarkEvidenceByModelId } from './web4-benchmark-analysis';

function cents(value: number) {
  return Math.round(value * 100);
}

function mean(scores: number[]) {
  const totalCents = scores.reduce((sum, score) => sum + cents(score), 0);
  return Math.floor((totalCents + scores.length / 2) / scores.length) / 100;
}

function median(scores: number[]) {
  const ordered = scores.map(cents).sort((left, right) => left - right);
  const middlePairTotal = ordered[4] + ordered[5];
  return Math.floor((middlePairTotal + 1) / 2) / 100;
}

function tier(score: number) {
  if (score >= 60) return 'S';
  if (score >= 50) return 'A';
  if (score >= 40) return 'B';
  if (score >= 30) return 'C';
  if (score >= 20) return 'D';
  return 'E';
}

describe('current Web4 benchmark selection', () => {
  it('pins 19 unique models to complete 10-round leaderboard rows', () => {
    expect(benchmark.releaseId).toBe('web4-graph-v2-leaderboard-20260815-v3');
    expect(benchmark.assets).toEqual({
      modelLeaderboardImage: '/images/test/web4-graph-v2-leaderboard-20260815-v3/model-leaderboard.png',
      modelLeaderboardSha256: 'c34982446057f1d9229991e7bab9bf18c37b80c170a68afaf8afbbeb46d3623c',
      valueLeaderboardImage: '/images/test/web4-graph-v2-leaderboard-20260815-v3/value-leaderboard.png',
      valueLeaderboardSha256: '978c40872a31280220d9afca966d9b2e2e673bd44b30290608328e2fe40d1717',
    });
    expect(benchmark.rows).toHaveLength(19);
    expect(new Set(benchmark.rows.map((row) => row.model_id)).size).toBe(19);
    expect(benchmark.rows.map((row) => row.model)).not.toContain('Hunyuan Hy3');
    expect(benchmark.rows.map((row) => row.model)).not.toContain('MiniMax M3');
    expect(benchmark.rows.map((row) => row.model)).toContain('DeepSeek V4 Pro 正式版');
    expect(benchmark.rows.map((row) => row.model)).toContain('DeepSeek V4 Flash 正式版');
    expect(benchmark.rows.filter((row) => row.model === 'DeepSeek V4 Flash')).toHaveLength(0);

    for (const [index, row] of benchmark.rows.entries()) {
      expect(row.rank).toBe(index + 1);
      expect(row.scores).toHaveLength(10);
      expect(row.score_mean).toBe(mean(row.scores));
      expect(row.score_median).toBe(median(row.scores));
      expect(row.tier).toBe(row.model === 'LongCat 2.0' ? 'D' : tier(row.score_mean));
      expect(row.avg_wall_minutes).toBeGreaterThan(0);
      expect(row.api_calls_10_tasks).toBeGreaterThan(0);
      expect(row.cost_cny_10_tasks).toBeGreaterThan(0);
      expect(row.total_tokens_10_tasks).toBeGreaterThan(0);
      expect(row.cost_estimated).toEqual(expect.any(Boolean));
      expect('source_label' in row).toBe(false);
      expect('source_run_id' in row).toBe(false);
    }
  });

  it('is sorted by mean score, then remains stable by declared rank', () => {
    for (let index = 1; index < benchmark.rows.length; index += 1) {
      expect(benchmark.rows[index - 1].score_mean).toBeGreaterThanOrEqual(
        benchmark.rows[index].score_mean,
      );
    }
  });

  it('keeps one complete evidence card for every model', () => {
    expect(Object.keys(benchmarkEvidenceByModelId).sort()).toEqual(
      benchmark.rows.map((row) => row.model_id).sort(),
    );

    for (const row of benchmark.rows) {
      const evidence = benchmarkEvidenceByModelId[row.model_id];
      expect(evidence.conclusion.length).toBeGreaterThan(10);
      expect(evidence.observedStrengths.length).toBeGreaterThanOrEqual(2);
      expect(evidence.observedFailures.length).toBeGreaterThanOrEqual(2);
    }

  });

  it('keeps the frozen Doubao metrics and Qwen formal API price in the same rows', () => {
    const doubao = benchmark.rows.find((row) => row.model === 'Doubao Seed Evolving');
    const qwen = benchmark.rows.find((row) => row.model === 'Qwen 3.8 Max');

    expect(doubao).toMatchObject({
      score_mean: 28.7,
      avg_wall_minutes: 5.44,
      api_calls_10_tasks: 179,
      cost_cny_10_tasks: 13.178,
    });
    expect(doubao?.scores[4]).toBe(19.25);
    expect(qwen?.cost_cny_10_tasks).toBe(38.218);
  });

  it('reproduces the published value ranking with the declared weighted-rank formula', () => {
    const metrics = [
      'cost_cny_10_tasks',
      'avg_wall_minutes',
      'api_calls_10_tasks',
      'total_tokens_10_tasks',
    ] as const;
    const weights = [0.4, 0.25, 0.2, 0.15];
    const ranks = metrics.map((metric) => {
      const ordered = [...benchmark.rows].sort(
        (left, right) => left[metric] - right[metric] || left.model.localeCompare(right.model),
      );
      return new Map(ordered.map((row, index) => [row.model_id, index + 1]));
    });
    const values = benchmark.rows
      .map((row) => {
        const consumptionRank = ranks.reduce(
          (total, metricRanks, index) => total + Number(metricRanks.get(row.model_id)) * weights[index],
          0,
        );
        return { model: row.model, value: row.score_mean / consumptionRank };
      })
      .sort((left, right) => right.value - left.value || left.model.localeCompare(right.model));

    expect(values.map((row) => row.model)).toEqual([
      'Grok 4.5',
      'Grok 4.6',
      'GPT-5.6 Luna',
      'DeepSeek V4 Pro 正式版',
      'GPT-5.6 Sol',
      'DeepSeek V4 Flash 正式版',
      'Qwen 3.8 Max',
      'Claude Fable 5',
      'DeepSeek V4 Pro',
      'Doubao Seed Evolving',
      'Kimi K3',
      'Qwen 3.7 Max',
      'GLM-5.3',
      'MiMo 2.5 Pro',
      'Step 3.7 Flash',
      'GLM 5.2',
      'Claude Opus 5',
      'LongCat 2.0',
      'ERNIE 5.1',
    ]);
    expect(values.slice(0, 3).map((row) => Number(row.value.toFixed(2)))).toEqual([11.02, 10.75, 7.71]);
  });
});
