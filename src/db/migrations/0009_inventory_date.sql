ALTER TABLE "inventory_sessions" ADD COLUMN "inventory_date" timestamp with time zone;
--> statement-breakpoint
UPDATE "inventory_sessions" SET "inventory_date" = "created_at" WHERE "inventory_date" IS NULL;
--> statement-breakpoint
ALTER TABLE "inventory_sessions" ALTER COLUMN "inventory_date" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "inventory_sessions" ALTER COLUMN "inventory_date" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_sessions_org_date_idx" ON "inventory_sessions" ("organization_id", "inventory_date");
