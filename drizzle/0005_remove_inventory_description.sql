PRAGMA foreign_keys=off;
--> statement-breakpoint
BEGIN TRANSACTION;
--> statement-breakpoint
CREATE TABLE `inventories_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `inventories_new` (`id`, `name`, `created_at`)
SELECT `id`, `name`, `created_at` FROM `inventories`;
--> statement-breakpoint
DROP TABLE `inventories`;
--> statement-breakpoint
ALTER TABLE `inventories_new` RENAME TO `inventories`;
--> statement-breakpoint
COMMIT;
--> statement-breakpoint
PRAGMA foreign_keys=on;
