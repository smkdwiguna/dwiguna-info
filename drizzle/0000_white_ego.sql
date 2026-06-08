CREATE TABLE `attendance_marks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_user_id` integer NOT NULL,
	`sheet_id` integer NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`edited_by_email` text NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`device_user_id`) REFERENCES `device_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sheet_id`) REFERENCES `attendance_sheets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_marks_device_user_id_sheet_id_date_unique` ON `attendance_marks` (`device_user_id`,`sheet_id`,`date`);--> statement-breakpoint
CREATE TABLE `attendance_sheets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `device_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`fingerprint` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_users_email_unique` ON `device_users` (`email`);--> statement-breakpoint
CREATE TABLE `inventories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`drive_file_id` text NOT NULL,
	`name` text NOT NULL,
	`web_view_link` text,
	`thumbnail_link` text,
	`uploaded_by_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_item_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`file_id` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `inventory_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_item_attachments_item_id_file_id_unique` ON `inventory_item_attachments` (`item_id`,`file_id`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`location` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_members_inventory_id_email_unique` ON `inventory_members` (`inventory_id`,`email`);--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`notes` text,
	`created_by_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `point_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`presence_point_id` integer NOT NULL,
	`terminal_id` text NOT NULL,
	`date` text NOT NULL,
	`start_time` integer,
	`threshold_time` integer,
	`end_time` integer,
	FOREIGN KEY (`presence_point_id`) REFERENCES `presence_points`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `point_schedules_presence_point_id_terminal_id_date_unique` ON `point_schedules` (`presence_point_id`,`terminal_id`,`date`);--> statement-breakpoint
CREATE TABLE `presence_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_user_id` integer NOT NULL,
	`presence_point_id` integer NOT NULL,
	`terminal_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`device_user_id`) REFERENCES `device_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`presence_point_id`) REFERENCES `presence_points`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `presence_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sheet_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_time` integer NOT NULL,
	`threshold_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	FOREIGN KEY (`sheet_id`) REFERENCES `attendance_sheets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`terminal_id` text NOT NULL,
	`sheet_id` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sheet_id`) REFERENCES `attendance_sheets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedules_terminal_id_sheet_id_date_unique` ON `schedules` (`terminal_id`,`sheet_id`,`date`);--> statement-breakpoint
CREATE TABLE `sheet_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sheet_id` integer NOT NULL,
	`org_unit_path` text NOT NULL,
	`alias` text NOT NULL,
	FOREIGN KEY (`sheet_id`) REFERENCES `attendance_sheets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `short_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`original_url` text NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`click_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `short_links_slug_unique` ON `short_links` (`slug`);--> statement-breakpoint
CREATE TABLE `terminals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT '0' NOT NULL,
	`password` text,
	`timeout` integer DEFAULT 0,
	`metadata` text,
	`sync_queue` text
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`signer_email` text NOT NULL,
	`document_hash` text NOT NULL,
	`gdrive_file_id` text,
	`signed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signature_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`owner_email` text NOT NULL,
	`drive_file_id` text,
	`drive_web_view_link` text,
	`drive_thumbnail_link` text,
	`drive_owner_email` text,
	`document_hash` text,
	`is_public` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signature_signers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` text NOT NULL,
	`signer_email` text NOT NULL,
	`invited_by_email` text NOT NULL,
	`status` text DEFAULT 'INVITED' NOT NULL,
	`signature_index` integer,
	`signature` text,
	`public_key` text,
	`qr_page` integer,
	`qr_x` real,
	`qr_y` real,
	`qr_width` real,
	`qr_height` real,
	`signed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `signature_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signature_signers_document_id_signer_email_unique` ON `signature_signers` (`document_id`,`signer_email`);--> statement-breakpoint
CREATE TABLE `user_keys` (
	`user_email` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`encrypted_private_key` text NOT NULL,
	`certificate` text NOT NULL,
	`algorithm` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
