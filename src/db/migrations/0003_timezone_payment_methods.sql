CREATE TYPE "public"."payment_method_kind" AS ENUM('cash', 'mobile_money', 'card_transfer', 'credit');--> statement-breakpoint
CREATE TABLE "organization_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"kind" "payment_method_kind" DEFAULT 'cash' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_payments" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "supplier_deliveries" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD COLUMN "counted_by_method" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "timezone" text DEFAULT 'Africa/Abidjan' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_payment_methods" ADD CONSTRAINT "organization_payment_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_payment_methods_org_code_key" ON "organization_payment_methods" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "org_payment_methods_org_idx" ON "organization_payment_methods" USING btree ("organization_id");--> statement-breakpoint
-- Reprise des comptages de caisse legacy vers le JSON dynamique.
UPDATE "cash_sessions"
SET "counted_by_method" = jsonb_strip_nulls(jsonb_build_object(
  'especes', "counted_especes",
  'orange_money', "counted_orange_money",
  'mtn_momo', "counted_mtn_momo",
  'wave', "counted_wave",
  'carte_virement', "counted_carte_virement"
))
WHERE "status" = 'closed' AND "counted_by_method" IS NULL;
--> statement-breakpoint
-- Reprise du catalogue de moyens de paiement a partir du tableau actif.
INSERT INTO "organization_payment_methods" ("organization_id", "code", "label", "kind", "sort_order", "is_active")
SELECT
  o.id,
  m.code,
  m.label,
  m.kind::"payment_method_kind",
  m.sort_order,
  CASE WHEN m.code = ANY (o.active_payment_methods) THEN 1 ELSE 0 END
FROM "organizations" o
CROSS JOIN (VALUES
  ('especes', 'Especes', 'cash', 0),
  ('orange_money', 'Orange Money', 'mobile_money', 1),
  ('mtn_momo', 'MTN MoMo', 'mobile_money', 2),
  ('wave', 'Wave', 'mobile_money', 3),
  ('carte_virement', 'Carte / Virement', 'card_transfer', 4),
  ('credit_client', 'Credit client', 'credit', 5)
) AS m(code, label, kind, sort_order)
ON CONFLICT ("organization_id", "code") DO NOTHING;
