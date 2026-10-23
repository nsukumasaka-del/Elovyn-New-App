CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  favicon_url TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT NOT NULL DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT 'Own your look.',
  hero_subtitle TEXT NOT NULL DEFAULT '',
  announcement_bar_text TEXT NOT NULL DEFAULT '',
  hero_primary_cta_text TEXT NOT NULL DEFAULT 'Shop new arrivals',
  hero_primary_cta_url TEXT NOT NULL DEFAULT '/categories/new-arrivals',
  hero_secondary_cta_text TEXT NOT NULL DEFAULT 'Shop streetwear',
  hero_secondary_cta_url TEXT NOT NULL DEFAULT '/categories/streetwear',
  promotional_banner_title TEXT NOT NULL DEFAULT '',
  promotional_banner_text TEXT NOT NULL DEFAULT '',
  promotional_banner_image_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (
  id,
  logo_url,
  favicon_url,
  hero_title,
  hero_subtitle,
  announcement_bar_text
) VALUES (
  'default',
  '/elovyn-logo.jpeg?v=3',
  '/elovyn-logo.jpeg?v=3',
  'Own your look.',
  'Streetwear made to stand out. Clean silhouettes, premium essentials, and effortless everyday pieces.',
  'FREE DELIVERY ON ORDERS OVER R1,500'
);
