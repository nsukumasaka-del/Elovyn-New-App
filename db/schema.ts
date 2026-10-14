import { sql } from "drizzle-orm";
import { boolean, check, index, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text({ enum: ["customer", "admin"] }).notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("users_role_check", sql`${table.role} IN ('customer', 'admin')`),
]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("sessions_expires_at_idx").on(table.expiresAt),
]);

export const products = pgTable("products", {
  id: text().primaryKey(),
  title: text().notNull(),
  sku: text().notNull().unique(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  status: text().notNull().default("In Stock"),
  category: text(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("products_price_check", sql`${table.price} >= 0`),
  check("products_stock_quantity_check", sql`${table.stockQuantity} >= 0`),
  check("products_status_check", sql`${table.status} IN ('In Stock', 'Low Stock', 'Out of Stock')`),
]);

export const orders = pgTable("orders", {
  id: text().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text().notNull().default("Pending"),
  itemsJson: text("items_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("orders_total_amount_check", sql`${table.totalAmount} >= 0`),
  index("orders_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
]);

export const supplierIntegrations = pgTable("supplier_integrations", {
  id: text().primaryKey(),
  name: text().notNull(),
  apiBaseUrl: text("api_base_url"),
  webhookUrl: text("webhook_url"),
  encryptedApiKey: text("encrypted_api_key"),
  autoSync: boolean("auto_sync").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
