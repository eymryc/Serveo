ALTER TABLE "products" ADD COLUMN "unit_label" text DEFAULT 'unite' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "package_label" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "units_per_package" integer;