CREATE TABLE "alerts_sent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts_sent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job" text NOT NULL,
	"run_key" text NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"duration_ms" integer,
	"error" text,
	"bytes" bigint,
	CONSTRAINT "job_runs_status_check" CHECK ("job_runs"."status" in ('running', 'ok', 'failed')),
	CONSTRAINT "job_runs_numbers_check" CHECK ("job_runs"."duration_ms" >= 0 and "job_runs"."bytes" >= 0 and "job_runs"."attempts" >= 1)
);
--> statement-breakpoint
ALTER TABLE "job_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fcm_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_fcm_token_check" CHECK (length("push_tokens"."fcm_token") between 1 and 4096)
);
--> statement-breakpoint
ALTER TABLE "push_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_jobs_status_check" CHECK ("scheduled_jobs"."status" in ('due', 'running', 'done', 'failed')),
	CONSTRAINT "scheduled_jobs_attempts_check" CHECK ("scheduled_jobs"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_sent_alert_key" ON "alerts_sent" USING btree ("user_id","alert_key");--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_run_key" ON "job_runs" USING btree ("user_id","run_key");--> statement-breakpoint
CREATE INDEX "job_runs_job_idx" ON "job_runs" USING btree ("job","status","ran_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_fcm_token" ON "push_tokens" USING btree ("user_id","fcm_token");--> statement-breakpoint
CREATE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("fcm_token");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_jobs_dedupe_key" ON "scheduled_jobs" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_due_idx" ON "scheduled_jobs" USING btree ("run_at") WHERE "scheduled_jobs"."status" in ('due', 'running');--> statement-breakpoint
CREATE POLICY "alerts_sent_own_select" ON "alerts_sent" AS PERMISSIVE FOR SELECT TO "app_user" USING ("alerts_sent"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "alerts_sent_own_insert" ON "alerts_sent" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("alerts_sent"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "alerts_sent_own_delete" ON "alerts_sent" AS PERMISSIVE FOR DELETE TO "app_user" USING ("alerts_sent"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "job_runs_own_select" ON "job_runs" AS PERMISSIVE FOR SELECT TO "app_user" USING ("job_runs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "job_runs_own_insert" ON "job_runs" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("job_runs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "job_runs_own_update" ON "job_runs" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("job_runs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("job_runs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "push_tokens_own_select" ON "push_tokens" AS PERMISSIVE FOR SELECT TO "app_user" USING ("push_tokens"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "push_tokens_own_delete" ON "push_tokens" AS PERMISSIVE FOR DELETE TO "app_user" USING ("push_tokens"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_jobs_own_select" ON "scheduled_jobs" AS PERMISSIVE FOR SELECT TO "app_user" USING ("scheduled_jobs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_jobs_own_insert" ON "scheduled_jobs" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("scheduled_jobs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_jobs_own_update" ON "scheduled_jobs" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("scheduled_jobs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("scheduled_jobs"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));