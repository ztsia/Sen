CREATE TABLE "bank_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"package" text NOT NULL,
	"channel_id" text,
	"notification_key" text NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"notified_at" timestamp with time zone NOT NULL,
	"title" text,
	"text" text,
	"big_text" text,
	"maybe_otp" boolean DEFAULT false NOT NULL,
	"dedupe_key" text NOT NULL,
	"parsed_by" uuid,
	"parse_status" text DEFAULT 'unparsed' NOT NULL,
	"parsed" jsonb,
	"linked_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_events_status_check" CHECK ("bank_events"."parse_status" in ('parsed', 'ignored', 'skipped', 'unparsed', 'dismissed')),
	CONSTRAINT "bank_events_dedupe_key_check" CHECK ("bank_events"."dedupe_key" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "bank_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "capture_apps" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"package" text NOT NULL,
	"label" text NOT NULL,
	"chosen_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "capture_apps_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "capture_apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "device_heartbeats" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"listener_connected" boolean NOT NULL,
	"access" boolean NOT NULL,
	"last_bank_event_at" timestamp with time zone,
	"app_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_heartbeats_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "device_heartbeats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outbox_applied" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_applied_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "outbox_applied" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_events" ADD CONSTRAINT "bank_events_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_events" ADD CONSTRAINT "bank_events_linked_event_id_bank_events_id_fk" FOREIGN KEY ("linked_event_id") REFERENCES "public"."bank_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_apps" ADD CONSTRAINT "capture_apps_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_heartbeats" ADD CONSTRAINT "device_heartbeats_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_applied" ADD CONSTRAINT "outbox_applied_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_events_dedupe_key" ON "bank_events" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "bank_events_user_posted_idx" ON "bank_events" USING btree ("user_id","posted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "capture_apps_live" ON "capture_apps" USING btree ("user_id","package") WHERE "capture_apps"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "capture_apps_user_version_idx" ON "capture_apps" USING btree ("user_id","version");--> statement-breakpoint
CREATE INDEX "device_heartbeats_user_created_idx" ON "device_heartbeats" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "outbox_applied_user_idx" ON "outbox_applied" USING btree ("user_id","applied_at");--> statement-breakpoint
CREATE POLICY "bank_events_own_select" ON "bank_events" AS PERMISSIVE FOR SELECT TO "app_user" USING ("bank_events"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "bank_events_own_insert" ON "bank_events" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("bank_events"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "bank_events_own_update" ON "bank_events" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("bank_events"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("bank_events"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "capture_apps_own_select" ON "capture_apps" AS PERMISSIVE FOR SELECT TO "app_user" USING ("capture_apps"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "capture_apps_own_insert" ON "capture_apps" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("capture_apps"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "capture_apps_own_update" ON "capture_apps" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("capture_apps"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("capture_apps"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "device_heartbeats_own_select" ON "device_heartbeats" AS PERMISSIVE FOR SELECT TO "app_user" USING ("device_heartbeats"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "device_heartbeats_own_insert" ON "device_heartbeats" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("device_heartbeats"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "outbox_applied_own_select" ON "outbox_applied" AS PERMISSIVE FOR SELECT TO "app_user" USING ("outbox_applied"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "outbox_applied_own_insert" ON "outbox_applied" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("outbox_applied"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));