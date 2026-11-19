ALTER TABLE orders ADD COLUMN courier TEXT;
ALTER TABLE orders ADD COLUMN admin_notes TEXT;

CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_purchase_idx
  ON product_reviews(product_id, user_id, order_id);
CREATE INDEX IF NOT EXISTS product_reviews_product_status_created_idx
  ON product_reviews(product_id, status, created_at);

CREATE TABLE IF NOT EXISTS site_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS site_reviews_order_idx
  ON site_reviews(order_id);
CREATE INDEX IF NOT EXISTS site_reviews_featured_rating_created_idx
  ON site_reviews(is_featured, rating, created_at);
