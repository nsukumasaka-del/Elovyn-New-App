import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("users_role_check", sql`${table.role} IN ('customer', 'admin')`),
]);

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
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
  stockQuantity: integer("stock_quantity").notNull().default(0),
  status: text("status").notNull().default("In Stock"),
  category: text("category"),
  imageUrl: text("image_url"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("products_price_check", sql`${table.price} >= 0`),
  check("products_stock_quantity_check", sql`${table.stockQuantity} >= 0`),
  check("products_status_check", sql`${table.status} IN ('In Stock', 'Low Stock', 'Out of Stock')`),
]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("Pending"),
  itemsJson: text("items_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("orders_total_amount_check", sql`${table.totalAmount} >= 0`),
  index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
]);

export const supplierIntegrations = sqliteTable("supplier_integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiBaseUrl: text("api_base_url"),
  webhookUrl: text("webhook_url"),
  encryptedApiKey: text("encrypted_api_key"),
  autoSync: integer("auto_sync", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const carts = sqliteTable("carts", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  itemsJson: text("items_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
