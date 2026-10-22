ALTER TABLE products ADD COLUMN is_listed INTEGER NOT NULL DEFAULT 1
  CHECK (is_listed IN (0, 1));

CREATE INDEX products_is_listed_idx ON products(is_listed);
