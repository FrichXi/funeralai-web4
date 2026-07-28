CREATE TABLE IF NOT EXISTS benchmark_vote_state (
  voter_hash TEXT NOT NULL,
  leaderboard_id TEXT NOT NULL,
  benchmark_version TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('raise', 'lower')),
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (voter_hash, leaderboard_id, benchmark_version, model_slug)
);

CREATE TABLE IF NOT EXISTS benchmark_vote_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_hash TEXT NOT NULL,
  rate_hash TEXT NOT NULL,
  leaderboard_id TEXT NOT NULL,
  benchmark_version TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('raise', 'lower') OR direction IS NULL),
  previous_direction TEXT CHECK (previous_direction IN ('raise', 'lower') OR previous_direction IS NULL),
  action TEXT NOT NULL CHECK (action IN ('vote', 'switch', 'clear')),
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS benchmark_vote_state_rollup_idx
  ON benchmark_vote_state (leaderboard_id, benchmark_version, model_slug, direction);

CREATE INDEX IF NOT EXISTS benchmark_vote_events_rate_idx
  ON benchmark_vote_events (rate_hash, created_at);

CREATE INDEX IF NOT EXISTS benchmark_vote_events_rollup_idx
  ON benchmark_vote_events (leaderboard_id, benchmark_version, model_slug, created_at);
