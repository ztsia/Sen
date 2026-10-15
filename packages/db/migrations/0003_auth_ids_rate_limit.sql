CREATE TABLE "auth_rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "auth_rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "auth_session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "auth_user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "auth_verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
CREATE POLICY "auth_rate_limit_auth" ON "auth_rate_limit" AS PERMISSIVE FOR ALL TO "sen_auth" USING (true) WITH CHECK (true);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_rate_limit TO sen_auth;
