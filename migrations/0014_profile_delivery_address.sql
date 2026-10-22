ALTER TABLE users ADD COLUMN delivery_address_json TEXT;
ALTER TABLE orders ADD COLUMN shipping_fee REAL NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0);
