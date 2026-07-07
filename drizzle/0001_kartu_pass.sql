CREATE TABLE `account_passes` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `owner_email` text NOT NULL,
    `front_drive_file_id` text,
    `back_drive_file_id` text,
    `qr_payload` text,
    `wallet_status` text DEFAULT 'NOT_READY' NOT NULL,
    `created_at` text DEFAULT(CURRENT_TIMESTAMP) NOT NULL,
    `updated_at` text DEFAULT(CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_passes_owner_email_unique` ON `account_passes` (`owner_email`);
--> statement-breakpoint