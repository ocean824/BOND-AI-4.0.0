CREATE TABLE "bond_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"bond_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"filename" varchar(500) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"kind" varchar(20) DEFAULT 'supporting' NOT NULL,
	"description" text,
	"ai_summary" text,
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonds" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"cusip" varchar(20),
	"isin" varchar(20),
	"ticker" varchar(20),
	"face_value" numeric(18, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"coupon_rate" numeric(6, 3),
	"coupon_type" varchar(50) DEFAULT 'fixed',
	"maturity_date" timestamp with time zone,
	"issue_date" timestamp with time zone,
	"jurisdiction" varchar(255),
	"governing_law" varchar(255),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle_judgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bundle_id" integer NOT NULL,
	"judgment_id" integer NOT NULL,
	"tranche" varchar(50) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"metrics_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"debtor_name" varchar(255),
	"case_number" varchar(255),
	"court" varchar(255),
	"jurisdiction" varchar(255),
	"judgment_amount" numeric(18, 2),
	"judgment_date" timestamp with time zone,
	"status" varchar(50) DEFAULT 'uploaded' NOT NULL,
	"file_name" varchar(500),
	"notes" text,
	"raw_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"judgment_id" integer NOT NULL,
	"scenario_name" varchar(50) DEFAULT 'base' NOT NULL,
	"target_irr" numeric(5, 2) NOT NULL,
	"discount_rate" numeric(5, 2) NOT NULL,
	"expected_recovery_pct" numeric(5, 2) NOT NULL,
	"recommended_purchase_price" numeric(18, 2) NOT NULL,
	"scenario_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"judgment_id" integer NOT NULL,
	"score" integer NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"reasoning" text,
	"model_used" varchar(100),
	"factors_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'analyst' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bond_documents" ADD CONSTRAINT "bond_documents_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bond_documents" ADD CONSTRAINT "bond_documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonds" ADD CONSTRAINT "bonds_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_judgments" ADD CONSTRAINT "bundle_judgments_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_judgments" ADD CONSTRAINT "bundle_judgments_judgment_id_judgments_id_fk" FOREIGN KEY ("judgment_id") REFERENCES "public"."judgments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judgments" ADD CONSTRAINT "judgments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_estimates" ADD CONSTRAINT "price_estimates_judgment_id_judgments_id_fk" FOREIGN KEY ("judgment_id") REFERENCES "public"."judgments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_scores" ADD CONSTRAINT "recovery_scores_judgment_id_judgments_id_fk" FOREIGN KEY ("judgment_id") REFERENCES "public"."judgments"("id") ON DELETE no action ON UPDATE no action;