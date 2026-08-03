CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "active_payment_methods" text[] DEFAULT ARRAY['especes','orange_money','mtn_momo','wave','carte_virement','credit_client']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_categories_org_idx" ON "expense_categories" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;