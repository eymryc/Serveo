ALTER TABLE "sales" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
CREATE INDEX "sales_batch_idx" ON "sales" USING btree ("batch_id");
