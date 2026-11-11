CREATE TABLE "account_names" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"package" text NOT NULL,
	"label" text NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "account_names_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "account_names_label_check" CHECK (length("account_names"."label") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "account_names" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"notifier_package" text,
	"notifier_label" text,
	"opening_balance" bigint DEFAULT 0 NOT NULL,
	"opening_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "accounts_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "accounts_kind_check" CHECK ("accounts"."kind" in ('tracked', 'elsewhere')),
	CONSTRAINT "accounts_name_check" CHECK (length(btrim("accounts"."name")) between 1 and 60),
	CONSTRAINT "accounts_elsewhere_check" CHECK ("accounts"."kind" = 'tracked' or ("accounts"."notifier_package" is null and "accounts"."opening_balance" = 0)),
	CONSTRAINT "accounts_app_check" CHECK (("accounts"."notifier_package" is null) = ("accounts"."notifier_label" is null)),
	CONSTRAINT "accounts_opening_check" CHECK (abs("accounts"."opening_balance") <= 9999999999999),
	CONSTRAINT "accounts_currency_check" CHECK ("accounts"."currency" = 'MYR')
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_discretionary" boolean DEFAULT false NOT NULL,
	"is_meal" boolean DEFAULT false NOT NULL,
	"is_beverage" boolean DEFAULT false NOT NULL,
	"kind" text NOT NULL,
	"system_key" text,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "categories_kind_check" CHECK ("categories"."kind" in ('spend', 'income')),
	CONSTRAINT "categories_name_check" CHECK (length(btrim("categories"."name")) between 1 and 40),
	CONSTRAINT "categories_system_key_check" CHECK ("categories"."system_key" is null or ("categories"."system_key" = 'salary' and "categories"."kind" = 'income') or ("categories"."system_key" in ('cash', 'unaccounted') and "categories"."kind" = 'spend')),
	CONSTRAINT "categories_system_kept_check" CHECK ("categories"."system_key" is null or "categories"."archived_at" is null),
	CONSTRAINT "categories_unaccounted_flags_check" CHECK ("categories"."system_key" is distinct from 'unaccounted' or not ("categories"."is_discretionary" or "categories"."is_meal" or "categories"."is_beverage")),
	CONSTRAINT "categories_income_flags_check" CHECK ("categories"."kind" = 'spend' or not ("categories"."is_discretionary" or "categories"."is_meal" or "categories"."is_beverage"))
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"bank_event_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"direction" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"kind" text NOT NULL,
	"merchant_raw" text,
	"merchant_key" text,
	"category_id" uuid,
	"my_share" bigint,
	"source" text NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "transactions_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "transactions_direction_check" CHECK ("transactions"."direction" in ('out', 'in')),
	CONSTRAINT "transactions_kind_check" CHECK ("transactions"."kind" in ('spend', 'income', 'transfer', 'repayment', 'refund', 'adjustment')),
	CONSTRAINT "transactions_source_check" CHECK ("transactions"."source" in ('notification', 'receipt', 'manual', 'inferred', 'adjustment')),
	CONSTRAINT "transactions_status_check" CHECK ("transactions"."status" in ('needs_attention', 'done', 'pending')),
	CONSTRAINT "transactions_amount_check" CHECK ("transactions"."amount" between 0 and 9999999999999),
	CONSTRAINT "transactions_my_share_check" CHECK ("transactions"."my_share" is null or ("transactions"."kind" = 'spend' and "transactions"."my_share" between 0 and "transactions"."amount")),
	CONSTRAINT "transactions_currency_check" CHECK ("transactions"."currency" = 'MYR')
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "setup_done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "version" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
-- before the foreign key that refers to it
CREATE UNIQUE INDEX "bank_events_user_id" ON "bank_events" USING btree ("user_id","id");--> statement-breakpoint
ALTER TABLE "account_names" ADD CONSTRAINT "account_names_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_names" ADD CONSTRAINT "account_names_user_id_account_id_accounts_user_id_id_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_account_id_accounts_user_id_id_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_category_id_categories_user_id_id_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."categories"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_bank_event_id_bank_events_user_id_id_fk" FOREIGN KEY ("user_id","bank_event_id") REFERENCES "public"."bank_events"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_names_label" ON "account_names" USING btree ("user_id","package","label");--> statement-breakpoint
CREATE INDEX "account_names_user_version_idx" ON "account_names" USING btree ("user_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_one_per_app" ON "accounts" USING btree ("user_id","notifier_package") WHERE "accounts"."archived_at" is null and "accounts"."notifier_package" is not null;--> statement-breakpoint
CREATE INDEX "accounts_user_version_idx" ON "accounts" USING btree ("user_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_key" ON "categories" USING btree ("user_id","system_key") WHERE "categories"."system_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_live_name" ON "categories" USING btree ("user_id",lower("name")) WHERE "categories"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "categories_user_version_idx" ON "categories" USING btree ("user_id","version");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("user_id","account_id","occurred_at") WHERE "transactions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "transactions_user_occurred_idx" ON "transactions" USING btree ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_event_idx" ON "transactions" USING btree ("user_id","bank_event_id") WHERE "transactions"."bank_event_id" is not null;--> statement-breakpoint
CREATE POLICY "account_names_own_select" ON "account_names" AS PERMISSIVE FOR SELECT TO "app_user" USING ("account_names"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "account_names_own_insert" ON "account_names" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("account_names"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "account_names_own_update" ON "account_names" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("account_names"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("account_names"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "accounts_own_select" ON "accounts" AS PERMISSIVE FOR SELECT TO "app_user" USING ("accounts"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "accounts_own_insert" ON "accounts" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("accounts"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "accounts_own_update" ON "accounts" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("accounts"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("accounts"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "categories_own_select" ON "categories" AS PERMISSIVE FOR SELECT TO "app_user" USING ("categories"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "categories_own_insert" ON "categories" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("categories"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "categories_own_update" ON "categories" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("categories"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("categories"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "transactions_own_select" ON "transactions" AS PERMISSIVE FOR SELECT TO "app_user" USING ("transactions"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "transactions_own_insert" ON "transactions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("transactions"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "transactions_own_update" ON "transactions" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("transactions"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid)) WITH CHECK ("transactions"."user_id" = (select nullif(current_setting('app.user_id', true), '')::uuid));