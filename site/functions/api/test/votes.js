const ALLOWED_DIRECTIONS = new Set(['raise', 'lower']);
const LEADERBOARD_ID = 'model_total';
const MAX_FIELD_LENGTH = 120;
const MAX_VOTES_PER_HOUR = 60;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function normalizeText(value, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeDirection(value) {
  return ALLOWED_DIRECTIONS.has(value) ? value : null;
}

function validateCommon(input) {
  const voterId = normalizeText(input.voterId, 160);
  const leaderboardId = normalizeText(input.leaderboardId, 40);
  const benchmarkVersion = normalizeText(input.benchmarkVersion, 160);
  const modelSlug = normalizeText(input.modelSlug, 80);

  if (!voterId || !benchmarkVersion || !modelSlug || leaderboardId !== LEADERBOARD_ID) {
    return { error: 'invalid vote payload' };
  }

  return {
    voterId,
    leaderboardId,
    benchmarkVersion,
    modelSlug,
  };
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requestHashes(request, env, voterId) {
  const salt = env.BENCHMARK_VOTE_SALT || 'funeralai-benchmark-vote-dev-salt';
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const voterHash = await sha256(`${salt}:voter:${voterId}`);
  const rateHash = await sha256(`${salt}:rate:${ip}:${dayKey()}`);

  return { voterHash, rateHash };
}

async function currentVote(db, common, voterHash) {
  const row = await db
    .prepare(
      `SELECT direction
       FROM benchmark_vote_state
       WHERE voter_hash = ?1
         AND leaderboard_id = ?2
         AND benchmark_version = ?3
         AND model_slug = ?4`
    )
    .bind(voterHash, common.leaderboardId, common.benchmarkVersion, common.modelSlug)
    .first();

  return normalizeDirection(row?.direction);
}

async function enforceRateLimit(db, rateHash) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM benchmark_vote_events
       WHERE rate_hash = ?1
         AND created_at >= datetime('now', '-1 hour')`
    )
    .bind(rateHash)
    .first();

  if (Number(row?.count || 0) >= MAX_VOTES_PER_HOUR) {
    return false;
  }

  return true;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: 'GET, POST, OPTIONS',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.BENCHMARK_VOTES_DB) {
    return json({ ok: false, error: 'vote database is not configured' }, 503);
  }

  const url = new URL(request.url);
  const common = validateCommon(Object.fromEntries(url.searchParams));

  if (common.error) {
    return json({ ok: false, error: common.error }, 400);
  }

  const { voterHash } = await requestHashes(request, env, common.voterId);
  const vote = await currentVote(env.BENCHMARK_VOTES_DB, common, voterHash);
  return json({ ok: true, currentVote: vote });
}

export async function onRequestPost({ request, env }) {
  if (!env.BENCHMARK_VOTES_DB) {
    return json({ ok: false, error: 'vote database is not configured' }, 503);
  }

  let input;

  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  const common = validateCommon(input);

  if (common.error) {
    return json({ ok: false, error: common.error }, 400);
  }

  const modelName = normalizeText(input.modelName, 80);
  const modelVersion = normalizeText(input.modelVersion, 120);
  const direction = input.direction === null ? null : normalizeDirection(input.direction);

  if (!modelName || !modelVersion || (input.direction !== null && !direction)) {
    return json({ ok: false, error: 'invalid vote payload' }, 400);
  }

  const db = env.BENCHMARK_VOTES_DB;
  const { voterHash, rateHash } = await requestHashes(request, env, common.voterId);
  const allowed = await enforceRateLimit(db, rateHash);

  if (!allowed) {
    return json({ ok: false, error: 'too many votes' }, 429);
  }

  const previousDirection = await currentVote(db, common, voterHash);
  const action = direction === null ? 'clear' : previousDirection && previousDirection !== direction ? 'switch' : 'vote';

  if (direction) {
    await db
      .prepare(
        `INSERT INTO benchmark_vote_state (
           voter_hash,
           leaderboard_id,
           benchmark_version,
           model_slug,
           model_name,
           model_version,
           direction,
           country,
           created_at,
           updated_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))
         ON CONFLICT(voter_hash, leaderboard_id, benchmark_version, model_slug)
         DO UPDATE SET
           model_name = excluded.model_name,
           model_version = excluded.model_version,
           direction = excluded.direction,
           country = excluded.country,
           updated_at = datetime('now')`
      )
      .bind(
        voterHash,
        common.leaderboardId,
        common.benchmarkVersion,
        common.modelSlug,
        modelName,
        modelVersion,
        direction,
        request.cf?.country || null
      )
      .run();
  } else {
    await db
      .prepare(
        `DELETE FROM benchmark_vote_state
         WHERE voter_hash = ?1
           AND leaderboard_id = ?2
           AND benchmark_version = ?3
           AND model_slug = ?4`
      )
      .bind(voterHash, common.leaderboardId, common.benchmarkVersion, common.modelSlug)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO benchmark_vote_events (
         voter_hash,
         rate_hash,
         leaderboard_id,
         benchmark_version,
         model_slug,
         model_name,
         model_version,
         direction,
         previous_direction,
         action,
         country,
         created_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, datetime('now'))`
    )
    .bind(
      voterHash,
      rateHash,
      common.leaderboardId,
      common.benchmarkVersion,
      common.modelSlug,
      modelName,
      modelVersion,
      direction,
      previousDirection,
      action,
      request.cf?.country || null
    )
    .run();

  return json({ ok: true, currentVote: direction });
}
