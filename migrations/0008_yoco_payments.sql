ALTER TABLE orders ADD COLUMN payment_provider TEXT;
ALTER TABLE orders ADD COLUMN payment_reference TEXT;
ALTER TABLE orders ADD COLUMN payment_id TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_idx
  ON orders(payment_reference) WHERE payment_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_provider_settings (
  provider TEXT PRIMARY KEY NOT NULL,
  mode TEXT NOT NULL,
  webhook_id TEXT,
  encrypted_webhook_secret TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
