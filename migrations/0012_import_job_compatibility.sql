-- Some early deployments used an incompatible product_import_jobs schema. A
-- versioned table upgrades those databases without altering or deleting old data.
CREATE TABLE IF NOT EXISTS product_import_jobs_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload_json TEXT NOT NULL,
  result_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS product_import_jobs_v2_created_at_idx ON product_import_jobs_v2(created_at);
