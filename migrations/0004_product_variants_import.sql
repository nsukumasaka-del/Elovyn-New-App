ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN description TEXT;
ALTER TABLE products ADD COLUMN compare_at_price REAL;
ALTER TABLE products ADD COLUMN handle TEXT;
ALTER TABLE products ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]';

UPDATE products
SET handle = lower(replace(title, ' ', '-')) || '-' || substr(id, 1, 6),
    images_json = CASE
      WHEN image_url IS NULL OR image_url = '' THEN '[]'
      ELSE json_array(image_url)
    END;

CREATE UNIQUE INDEX products_handle_idx ON products(handle);

CREATE TABLE options (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  values_json TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, name)
);

CREATE TABLE variants (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price REAL NOT NULL CHECK (price >= 0),
  compare_at_price REAL CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  barcode TEXT,
  options_json TEXT NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX variants_product_id_idx ON variants(product_id);

CREATE TABLE variant_option_values (
  variant_id TEXT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  PRIMARY KEY (variant_id, option_id)
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY NOT NULL,
  variant_id TEXT NOT NULL UNIQUE REFERENCES variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  track_quantity INTEGER NOT NULL DEFAULT 1 CHECK (track_quantity IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO variants (id, product_id, title, sku, price, options_json)
SELECT 'legacy-' || id, id, 'Default', sku, price, '{}'
FROM products;

INSERT INTO inventory_items (id, variant_id, quantity)
SELECT 'inventory-' || id, 'legacy-' || id, stock_quantity
FROM products;
