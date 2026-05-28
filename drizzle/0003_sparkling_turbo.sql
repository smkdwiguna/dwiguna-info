CREATE TABLE `inventories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`location` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade
);