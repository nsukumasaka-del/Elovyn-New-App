-- 0019 adds the order-management columns and creates these tables on fresh databases.
-- These compatibility columns retain explicit names for checkout and shipping data.
ALTER TABLE orders ADD COLUMN yoco_checkout_id TEXT;
ALTER TABLE orders ADD COLUMN shipping_address TEXT;

UPDATE orders
SET yoco_checkout_id = payment_reference
WHERE yoco_checkout_id IS NULL AND payment_reference IS NOT NULL;

UPDATE orders
SET shipping_address = delivery_address_json
WHERE shipping_address IS NULL AND delivery_address_json IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx
  ON orders(order_number) WHERE order_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  variant_details TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL DEFAULT 'new_order',
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_notifications_is_read_created_idx
  ON admin_notifications(is_read, created_at DESC);
