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
CREATE TABLE `terminals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'INHERIT' NOT NULL,
	`password` text,
	`timeout` integer DEFAULT 0,
	`metadata` text
);
