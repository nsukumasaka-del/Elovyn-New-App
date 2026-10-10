CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status TEXT NOT NULL DEFAULT 'In Stock'
        CHECK (status IN ('In Stock', 'Low Stock', 'Out of Stock')),
    category TEXT,
    image_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'Pending',
    items_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS supplier_integrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_base_url TEXT,
    webhook_url TEXT,
    encrypted_api_key TEXT,
    auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO products (id, title, sku, price, stock_quantity, category, image_url)
VALUES
    ('essential-box-tee', 'Essential Box Tee', 'ELO-TEE-001', 529.00, 18, 'Streetwear', NULL),
    ('everyday-overshirt', 'Everyday Overshirt', 'ELO-TEE-002', 699.00, 12, 'T-Shirts', NULL),
    ('layered-set', 'Layered Set', 'ELO-SET-001', 1249.00, 8, 'New Arrivals', NULL),
    ('signature-hoodie', 'Signature Hoodie', 'ELO-HOOD-001', 899.00, 9, 'Hoodies', NULL),
    ('raw-luxe-bundle', 'Raw Luxe Bundle', 'ELO-WIG-001', 1969.00, 6, 'Wigs', NULL),
    ('hydration-set', 'Hydration Set', 'ELO-CARE-001', 339.00, 14, 'Care', NULL),
    ('styling-kit', 'Styling Kit', 'ELO-ACC-001', 1923.00, 5, 'Accessories', NULL),
    ('signature-layer', 'Signature Layer', 'ELO-TEE-003', 899.00, 11, 'Best Seller', NULL),
    ('leather-crossbody', 'Leather Crossbody', 'ELO-BAG-001', 849.00, 7, 'Bags', NULL),
    ('structured-cap', 'Structured Cap', 'ELO-CAP-001', 399.00, 16, 'Hats', NULL),
    ('layered-chains', 'Layered Chains', 'ELO-JEW-001', 560.00, 10, 'Jewellery', NULL),
    ('everyday-tote', 'Everyday Tote', 'ELO-BAG-002', 720.00, 13, 'Accessories', NULL)
ON CONFLICT (id) DO NOTHING;
