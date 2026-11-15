-- Phase 1–3 ops : caisse, clients crédit, inventaire, fournisseurs, droits barman
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "member_can_cancel_sales" integer DEFAULT 1 NOT NULL;

DO $$ BEGIN
  CREATE TYPE "public"."cash_session_status" AS ENUM('open', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."inventory_session_status" AS ENUM('draft', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "note" text,
  "is_active" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "status" "cash_session_status" DEFAULT 'open' NOT NULL,
  "opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "closed_at" timestamp with time zone,
  "opened_by_user_id" text NOT NULL,
  "closed_by_user_id" text,
  "opening_float" numeric(12, 2) DEFAULT '0' NOT NULL,
  "counted_especes" numeric(12, 2),
  "counted_orange_money" numeric(12, 2),
  "counted_mtn_momo" numeric(12, 2),
  "counted_wave" numeric(12, 2),
  "counted_carte_virement" numeric(12, 2),
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "customer_id" uuid;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cash_session_id" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "payment_method" "payment_method" NOT NULL,
  "note" text,
  "paid_at" timestamp with time zone DEFAULT now() NOT NULL,
  "cash_session_id" uuid,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "status" "inventory_session_status" DEFAULT 'draft' NOT NULL,
  "note" text,
  "created_by_user_id" text NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "theoretical_qty" integer NOT NULL,
  "counted_qty" integer NOT NULL,
  "variance" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "note" text,
  "is_active" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "delivery_date" timestamp with time zone DEFAULT now() NOT NULL,
  "note" text,
  "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  "paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  "payment_method" "payment_method",
  "stock_batch_id" uuid,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_delivery_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "delivery_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_id_cash_sessions_id_fk"
    FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_cash_session_id_cash_sessions_id_fk"
    FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_lines" ADD CONSTRAINT "inventory_lines_session_id_inventory_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."inventory_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_lines" ADD CONSTRAINT "inventory_lines_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_deliveries" ADD CONSTRAINT "supplier_deliveries_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_deliveries" ADD CONSTRAINT "supplier_deliveries_supplier_id_suppliers_id_fk"
    FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_delivery_lines" ADD CONSTRAINT "supplier_delivery_lines_delivery_id_supplier_deliveries_id_fk"
    FOREIGN KEY ("delivery_id") REFERENCES "public"."supplier_deliveries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_delivery_lines" ADD CONSTRAINT "supplier_delivery_lines_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_org_idx" ON "customers" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_sessions_org_status_idx" ON "cash_sessions" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_customer_idx" ON "sales" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_cash_session_idx" ON "sales" USING btree ("cash_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_payments_org_idx" ON "customer_payments" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_payments_customer_idx" ON "customer_payments" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_sessions_org_idx" ON "inventory_sessions" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_lines_session_idx" ON "inventory_lines" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_org_idx" ON "suppliers" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_deliveries_org_idx" ON "supplier_deliveries" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_deliveries_supplier_idx" ON "supplier_deliveries" USING btree ("supplier_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_delivery_lines_delivery_idx" ON "supplier_delivery_lines" USING btree ("delivery_id");
