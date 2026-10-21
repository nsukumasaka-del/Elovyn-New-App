ALTER TABLE supplier_integrations ADD COLUMN adapter TEXT NOT NULL DEFAULT 'generic_json';
ALTER TABLE supplier_integrations ADD COLUMN field_mapping_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE supplier_integrations ADD COLUMN connection_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE supplier_integrations ADD COLUMN last_sync_at TEXT;
ALTER TABLE supplier_integrations ADD COLUMN last_sync_error TEXT;

ALTER TABLE products ADD COLUMN supplier_id TEXT REFERENCES supplier_integrations(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN supplier_product_id TEXT;
CREATE UNIQUE INDEX products_supplier_external_idx ON products(supplier_id, supplier_product_id)
WHERE supplier_id IS NOT NULL AND supplier_product_id IS NOT NULL;
