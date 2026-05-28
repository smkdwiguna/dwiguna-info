CREATE TABLE `inventory_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`drive_file_id` text NOT NULL,
	`name` text NOT NULL,
	`web_view_link` text,
	`thumbnail_link` text,
	`uploaded_by_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
CREATE UNIQUE INDEX `inventory_item_attachments_item_id_file_id_unique` ON `inventory_item_attachments` (`item_id`,`file_id`);