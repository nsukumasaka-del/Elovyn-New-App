CREATE TABLE "orders" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"total_amount" numeric(10,2) NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"items_json" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_amount_check" CHECK ("total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"sku" text NOT NULL UNIQUE,
	"price" numeric(10,2) NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'In Stock' NOT NULL,
	"category" text,
	"image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_check" CHECK ("price" >= 0),
	CONSTRAINT "products_stock_quantity_check" CHECK ("stock_quantity" >= 0),
	CONSTRAINT "products_status_check" CHECK ("status" IN ('In Stock', 'Low Stock', 'Out of Stock'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_integrations" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"api_base_url" text,
	"webhook_url" text,
	"encrypted_api_key" text,
	"auto_sync" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("role" IN ('customer', 'admin'))
);
--> statement-breakpoint
CREATE INDEX "orders_user_id_created_at_idx" ON "orders" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;