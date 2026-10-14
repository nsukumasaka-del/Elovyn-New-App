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
