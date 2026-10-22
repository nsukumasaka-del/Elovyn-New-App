import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  fullName: text("full_name"),
  googleId: text("google_id").unique(),
}, (table) => [
  check("users_role_check", sql`${table.role} IN ('customer', 'admin')`),
]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("sessions_expires_at_idx").on(table.expiresAt),
]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sku: text("sku").notNull().unique(),
  price: real("price").notNull(),
  compareAtPrice: real("compare_at_price"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  status: text("status").notNull().default("In Stock"),
  category: text("category"),
  brand: text("brand"),
  description: text("description"),
  handle: text("handle"),
  imageUrl: text("image_url"),
  imagesJson: text("images_json").notNull().default("[]"),
  supplierId: text("supplier_id"),
  supplierProductId: text("supplier_product_id"),
  isListed: integer("is_listed", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("products_price_check", sql`${table.price} >= 0`),
  check("products_stock_quantity_check", sql`${table.stockQuantity} >= 0`),
  check("products_status_check", sql`${table.status} IN ('In Stock', 'Low Stock', 'Out of Stock')`),
  index("products_is_listed_idx").on(table.isListed),
  uniqueIndex("products_handle_idx").on(table.handle),
  uniqueIndex("products_supplier_external_idx").on(table.supplierId, table.supplierProductId),
]);

export const options = sqliteTable("options", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  valuesJson: text("values_json").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  uniqueIndex("options_product_name_idx").on(table.productId, table.name),
]);

export const variants = sqliteTable("variants", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sku: text("sku").notNull().unique(),
  price: real("price").notNull(),
  compareAtPrice: real("compare_at_price"),
  barcode: text("barcode"),
  optionsJson: text("options_json").notNull().default("{}"),
  imageUrl: text("image_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("variants_product_id_idx").on(table.productId),
  check("variants_price_check", sql`${table.price} >= 0`),
]);

export const variantOptionValues = sqliteTable("variant_option_values", {
  variantId: text("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
  optionId: text("option_id").notNull().references(() => options.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
}, (table) => [
  primaryKey({ columns: [table.variantId, table.optionId] }),
]);

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  variantId: text("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0),
  trackQuantity: integer("track_quantity", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("inventory_items_quantity_check", sql`${table.quantity} >= 0`),
  uniqueIndex("inventory_items_variant_id_idx").on(table.variantId),
]);

export const productImportJobs = sqliteTable("product_import_jobs", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  payloadJson: text("payload_json").notNull(),
  resultJson: text("result_json"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("product_import_jobs_created_at_idx").on(table.createdAt),
]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("Pending"),
  itemsJson: text("items_json").notNull(),
  deliveryAddressJson: text("delivery_address_json"),
  paymentProvider: text("payment_provider"),
  paymentReference: text("payment_reference"),
  paymentId: text("payment_id"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("orders_total_amount_check", sql`${table.totalAmount} >= 0`),
  index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
  uniqueIndex("orders_payment_reference_idx").on(table.paymentReference),
]);

export const paymentProviderSettings = sqliteTable("payment_provider_settings", {
  provider: text("provider").primaryKey(),
  mode: text("mode").notNull(),
  webhookId: text("webhook_id"),
  encryptedWebhookSecret: text("encrypted_webhook_secret"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentWebhookEvents = sqliteTable("payment_webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supplierIntegrations = sqliteTable("supplier_integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiBaseUrl: text("api_base_url"),
  webhookUrl: text("webhook_url"),
  accountEmail: text("account_email"),
  encryptedApiKey: text("encrypted_api_key"),
  encryptedApiSecret: text("encrypted_api_secret"),
  adapter: text("adapter").notNull().default("generic_json"),
  fieldMappingJson: text("field_mapping_json").notNull().default("{}"),
  autoSync: integer("auto_sync", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  connectionStatus: text("connection_status").notNull().default("pending"),
  lastSyncAt: text("last_sync_at"),
  lastSyncError: text("last_sync_error"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supplierSyncHistory = sqliteTable("supplier_sync_history", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").notNull().references(() => supplierIntegrations.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["running", "success", "error"] }).notNull(),
  importedCount: integer("imported_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text("finished_at"),
}, (table) => [
  index("supplier_sync_history_supplier_started_idx").on(table.supplierId, table.startedAt),
]);

export const carts = sqliteTable("carts", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  itemsJson: text("items_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
