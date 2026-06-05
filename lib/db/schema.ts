import {
	pgTable,
	text,
	integer,
	serial,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

// Better Auth (sessions/accounts) + Correspondence (TTE) tables.
export * from "./auth-schema";
export * from "./tte-schema";

export const deviceUsers = pgTable("device_users", {
	// Hardware limit ID from 0 to 999
	id: integer("id").primaryKey(),
	// Google Workspace Email to link the user
	email: text("email").notNull().unique(),
	// Biometric data (if synced from terminal to database)
	fingerprint: text("fingerprint"),
});

export const terminals = pgTable("terminals", {
	id: text("id").primaryKey(), // MAC Address or UUID
	name: text("name").notNull(),
	status: text("status").notNull().default("0"), // 0 = Idle, 2 = Enroll, 3 = Copy, etc.
	password: text("password"),
	// Used to store the last seen epoch timestamp for online/offline detection
	timeout: integer("timeout").default(0),
	// Strictly holds the exact raw plain text command (e.g., "9;12;A1B2...")
	metadata: text("metadata"),
	// Holds an array of user IDs to be synced to the device
	syncQueue: text("sync_queue"),
});

export const attendanceSheets = pgTable("attendance_sheets", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
});

export const sheetTargets = pgTable("sheet_targets", {
	id: serial("id").primaryKey(),
	sheetId: integer("sheet_id")
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: "cascade" }),
	orgUnitPath: text("org_unit_path").notNull(), // e.g., /Siswa/2026/PPLG-1
	alias: text("alias").notNull(), // e.g., "10 PPLG 1"
});

export const presencePoints = pgTable("presence_points", {
	id: serial("id").primaryKey(),
	sheetId: integer("sheet_id")
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: "cascade" }),
	name: text("name").notNull(), // e.g., "Masuk Pagi"
	// Time in minutes from midnight (0 to 1440)
	startTime: integer("start_time").notNull(),
	thresholdTime: integer("threshold_time").notNull(),
	endTime: integer("end_time").notNull(),
});

export const schedules = pgTable(
	"schedules",
	{
		id: serial("id").primaryKey(),
		terminalId: text("terminal_id")
			.notNull()
			.references(() => terminals.id, { onDelete: "cascade" }),
		sheetId: integer("sheet_id")
			.notNull()
			.references(() => attendanceSheets.id, { onDelete: "cascade" }),
		date: text("date").notNull(), // YYYY-MM-DD format
	},
	(t) => ({
		// One terminal can technically have multiple sheets on the same date,
		// but we must check in application logic that their presencePoints don't overlap!
		unq: unique().on(t.terminalId, t.sheetId, t.date),
	}),
);

export const presenceLogs = pgTable("presence_logs", {
	id: serial("id").primaryKey(),
	deviceUserId: integer("device_user_id")
		.notNull()
		.references(() => deviceUsers.id, { onDelete: "cascade" }),
	presencePointId: integer("presence_point_id")
		.notNull()
		.references(() => presencePoints.id, { onDelete: "cascade" }),
	terminalId: text("terminal_id")
		.notNull()
		.references(() => terminals.id, { onDelete: "cascade" }),
	timestamp: integer("timestamp").notNull(), // Epoch time
	date: text("date").notNull(), // YYYY-MM-DD for easier querying
	status: text("status").notNull(), // PRESENT, LATE, ABSENT, SICK, PERMIT
});

export const shortLinks = pgTable("short_links", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	originalUrl: text("original_url").notNull(),
	createdByEmail: text("created_by_email").notNull(),
	createdAt: timestamp("created_at", { mode: "string" })
		.notNull()
		.defaultNow(),
	clickCount: integer("click_count").notNull().default(0),
});

export const inventories = pgTable("inventories", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { mode: "string" })
		.notNull()
		.defaultNow(),
});

export const inventoryMembers = pgTable(
	"inventory_members",
	{
		id: serial("id").primaryKey(),
		inventoryId: integer("inventory_id")
			.notNull()
			.references(() => inventories.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role").notNull(), // 'OWNER', 'EDITOR', 'VIEWER'
	},
	(t) => ({
		unq: unique().on(t.inventoryId, t.email),
	}),
);

export const inventoryItems = pgTable("inventory_items", {
	id: serial("id").primaryKey(),
	inventoryId: integer("inventory_id")
		.notNull()
		.references(() => inventories.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	sku: text("sku"),
	description: text("description"),
	quantity: integer("quantity").notNull().default(0),
	unit: text("unit").notNull().default("pcs"),
	location: text("location"),
	createdAt: timestamp("created_at", { mode: "string" })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "string" })
		.notNull()
		.defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: serial("id").primaryKey(),
	inventoryId: integer("inventory_id")
		.notNull()
		.references(() => inventories.id, { onDelete: "cascade" }),
	itemId: integer("item_id")
		.notNull()
		.references(() => inventoryItems.id, { onDelete: "cascade" }),
	type: text("type").notNull(), // 'IN', 'OUT', 'ADJUST'
	quantity: integer("quantity").notNull(),
	notes: text("notes"),
	createdByEmail: text("created_by_email").notNull(),
	createdAt: timestamp("created_at", { mode: "string" })
		.notNull()
		.defaultNow(),
});

export const inventoryFiles = pgTable("inventory_files", {
	id: serial("id").primaryKey(),
	inventoryId: integer("inventory_id")
		.notNull()
		.references(() => inventories.id, { onDelete: "cascade" }),
	driveFileId: text("drive_file_id").notNull(),
	name: text("name").notNull(),
	webViewLink: text("web_view_link"),
	thumbnailLink: text("thumbnail_link"),
	uploadedByEmail: text("uploaded_by_email").notNull(),
	createdAt: timestamp("created_at", { mode: "string" })
		.notNull()
		.defaultNow(),
});

export const inventoryItemAttachments = pgTable(
	"inventory_item_attachments",
	{
		id: serial("id").primaryKey(),
		itemId: integer("item_id")
			.notNull()
			.references(() => inventoryItems.id, { onDelete: "cascade" }),
		fileId: integer("file_id")
			.notNull()
			.references(() => inventoryFiles.id, { onDelete: "cascade" }),
	},
	(t) => ({
		unq: unique().on(t.itemId, t.fileId),
	}),
);
