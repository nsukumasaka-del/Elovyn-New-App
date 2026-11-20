ALTER TABLE product_reviews ADD COLUMN images TEXT NOT NULL DEFAULT '[]';

ALTER TABLE sessions ADD COLUMN last_active_at INTEGER NOT NULL DEFAULT 0;
UPDATE sessions SET last_active_at = unixepoch() WHERE last_active_at = 0;
