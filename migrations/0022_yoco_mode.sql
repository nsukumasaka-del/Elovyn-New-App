CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT
);

INSERT OR IGNORE INTO store_settings (key, value, updated_at)
VALUES ('yoco_mode', 'live', CURRENT_TIMESTAMP);

ALTER TABLE orders ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'live';

UPDATE orders
SET payment_mode = 'test'
WHERE payment_provider = 'yoco';
