ALTER TABLE "sales" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_by_user_id" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancel_reason" text;
