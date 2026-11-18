ALTER TABLE products ADD COLUMN supplier TEXT NOT NULL DEFAULT 'eprolo';
ALTER TABLE products ADD COLUMN supplier_sku TEXT;
ALTER TABLE products ADD COLUMN cost_price_usd REAL;

UPDATE products
SET supplier = 'cj'
WHERE supplier_id IN (SELECT id FROM supplier_integrations WHERE adapter = 'cj');

UPDATE products
SET supplier_sku = supplier_product_id
WHERE supplier_sku IS NULL AND supplier_product_id IS NOT NULL;

ALTER TABLE orders ADD COLUMN customer_phone TEXT;
ALTER TABLE orders ADD COLUMN postal_code TEXT;

ALTER TABLE order_items ADD COLUMN supplier TEXT NOT NULL DEFAULT 'eprolo';
ALTER TABLE order_items ADD COLUMN supplier_sku TEXT;
ALTER TABLE order_items ADD COLUMN cost_price_usd REAL;

UPDATE order_items
SET supplier = COALESCE(
  (SELECT products.supplier FROM products WHERE products.id = order_items.product_id),
  supplier
);

UPDATE order_items
SET supplier_sku = COALESCE(
  (SELECT products.supplier_sku FROM products WHERE products.id = order_items.product_id),
  variant_details
)
WHERE supplier_sku IS NULL;

UPDATE order_items
SET cost_price_usd = (
  SELECT products.cost_price_usd FROM products WHERE products.id = order_items.product_id
)
WHERE cost_price_usd IS NULL;

CREATE TABLE IF NOT EXISTS pricing_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  usd_to_zar_rate REAL,
  fee_buffer_percent REAL NOT NULL DEFAULT 10,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO pricing_settings (id, usd_to_zar_rate, fee_buffer_percent)
VALUES (1, NULL, 10);
