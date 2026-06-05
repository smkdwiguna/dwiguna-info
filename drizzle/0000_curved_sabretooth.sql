CREATE TABLE "attendance_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_users" (
	"id" integer PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"fingerprint" text,
	CONSTRAINT "device_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "inventories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"drive_file_id" text NOT NULL,
	"name" text NOT NULL,
	"web_view_link" text,
	"thumbnail_link" text,
	"uploaded_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_item_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	CONSTRAINT "inventory_item_attachments_item_id_file_id_unique" UNIQUE("item_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"description" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "inventory_members_inventory_id_email_unique" UNIQUE("inventory_id","email")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"created_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_user_id" integer NOT NULL,
	"presence_point_id" integer NOT NULL,
	"terminal_id" text NOT NULL,
	"timestamp" integer NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_time" integer NOT NULL,
	"threshold_time" integer NOT NULL,
	"end_time" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"terminal_id" text NOT NULL,
	"sheet_id" integer NOT NULL,
	"date" text NOT NULL,
	CONSTRAINT "schedules_terminal_id_sheet_id_date_unique" UNIQUE("terminal_id","sheet_id","date")
);
--> statement-breakpoint
CREATE TABLE "sheet_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet_id" integer NOT NULL,
	"org_unit_path" text NOT NULL,
	"alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"original_url" text NOT NULL,
	"created_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "short_links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "terminals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT '0' NOT NULL,
	"password" text,
	"timeout" integer DEFAULT 0,
	"metadata" text,
	"sync_queue" text
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"signer_email" text NOT NULL,
	"document_hash" text NOT NULL,
	"gdrive_file_id" text,
	"signed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"owner_email" text NOT NULL,
	"drive_file_id" text,
	"drive_web_view_link" text,
	"drive_thumbnail_link" text,
	"drive_owner_email" text,
	"document_hash" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_signers" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"signer_email" text NOT NULL,
	"invited_by_email" text NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"signature_index" integer,
	"signature" text,
	"public_key" text,
	"qr_page" integer,
	"qr_x" real,
	"qr_y" real,
	"qr_width" real,
	"qr_height" real,
	"signed_at" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "signature_signers_document_id_signer_email_unique" UNIQUE("document_id","signer_email")
);
--> statement-breakpoint
CREATE TABLE "user_keys" (
	"user_email" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"certificate" text NOT NULL,
	"algorithm" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_files" ADD CONSTRAINT "inventory_files_inventory_id_inventories_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item_attachments" ADD CONSTRAINT "inventory_item_attachments_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item_attachments" ADD CONSTRAINT "inventory_item_attachments_file_id_inventory_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."inventory_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_inventory_id_inventories_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_members" ADD CONSTRAINT "inventory_members_inventory_id_inventories_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_id_inventories_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_device_user_id_device_users_id_fk" FOREIGN KEY ("device_user_id") REFERENCES "public"."device_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_presence_point_id_presence_points_id_fk" FOREIGN KEY ("presence_point_id") REFERENCES "public"."presence_points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_points" ADD CONSTRAINT "presence_points_sheet_id_attendance_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."attendance_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_sheet_id_attendance_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."attendance_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_targets" ADD CONSTRAINT "sheet_targets_sheet_id_attendance_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."attendance_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_signers" ADD CONSTRAINT "signature_signers_document_id_signature_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."signature_documents"("id") ON DELETE cascade ON UPDATE no action;