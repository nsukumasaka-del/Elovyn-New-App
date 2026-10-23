CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_window_start_idx
  ON ai_rate_limits (window_start);
