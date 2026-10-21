CREATE TABLE IF NOT EXISTS product_import_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload_json TEXT NOT NULL,
  result_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS product_import_jobs_created_at_idx ON product_import_jobs(created_at);
