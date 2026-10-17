CREATE TABLE users_new (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  full_name TEXT,
  google_id TEXT UNIQUE
);

INSERT INTO users_new (id, email, password_hash, role, created_at)
SELECT id, email, password_hash, role, created_at
FROM users;

CREATE TABLE sessions_backup AS
SELECT token_hash, user_id, expires_at, created_at FROM sessions;
CREATE TABLE orders_backup AS
SELECT id, user_id, total_amount, status, items_json, created_at FROM orders;
CREATE TABLE carts_backup AS
SELECT user_id, items_json, updated_at FROM carts;

DROP TABLE carts;
DROP TABLE sessions;
DROP TABLE orders;
DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at)
SELECT lower(hex(randomblob(16))), token_hash, user_id, expires_at, created_at
FROM sessions_backup;

CREATE TABLE orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'Pending',
  items_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO orders (id, user_id, total_amount, status, items_json, created_at)
SELECT id, user_id, total_amount, status, items_json, created_at
FROM orders_backup;

CREATE TABLE carts (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO carts (user_id, items_json, updated_at)
SELECT user_id, items_json, updated_at FROM carts_backup;

DROP TABLE sessions_backup;
DROP TABLE orders_backup;
DROP TABLE carts_backup;

CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX orders_user_id_created_at_idx ON orders(user_id, created_at DESC);
