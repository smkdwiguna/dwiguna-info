import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Better Auth (sessions/accounts) + Correspondence (TTE) tables.
export * from "./auth-schema";
export * from "./tte-schema";
export * from "./announcement-schema";

export const deviceUsers = sqliteTable("device_users", {
	// Hardware limit ID from 0 to 999
	id: integer("id").primaryKey(),
	// Google Workspace Email to link the user
	email: text("email").notNull().unique(),
	// Biometric data (if synced from terminal to database)
	fingerprint: text("fingerprint"),
});

export const terminals = sqliteTable("terminals", {
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

export const attendanceSheets = sqliteTable("attendance_sheets", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
});

export const sheetTargets = sqliteTable("sheet_targets", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sheetId: integer("sheet_id")
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: "cascade" }),
	orgUnitPath: text("org_unit_path").notNull(), // e.g., /Siswa/2026/PPLG-1
	alias: text("alias").notNull(), // e.g., "10 PPLG 1"
});

export const presencePoints = sqliteTable("presence_points", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sheetId: integer("sheet_id")
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: "cascade" }),
	name: text("name").notNull(), // e.g., "Masuk Pagi"
	// Time in minutes from midnight (0 to 1440)
	startTime: integer("start_time").notNull(),
	thresholdTime: integer("threshold_time").notNull(),
	endTime: integer("end_time").notNull(),
});

export const schedules = sqliteTable(
	"schedules",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
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

// Per-day activation of a single presence point on a single terminal.
// This is the granular schedule that powers the global agenda/calendar:
// a day can have only a subset of a sheet's points, and each instance may
// override the point's default time window. A null override falls back to the
// presence point's default startTime/thresholdTime/endTime.
export const pointSchedules = sqliteTable(
	"point_schedules",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		presencePointId: integer("presence_point_id")
			.notNull()
			.references(() => presencePoints.id, { onDelete: "cascade" }),
		terminalId: text("terminal_id")
			.notNull()
			.references(() => terminals.id, { onDelete: "cascade" }),
		date: text("date").notNull(), // YYYY-MM-DD
		// Optional per-day overrides (minutes from midnight). Null = use default.
		startTime: integer("start_time"),
		thresholdTime: integer("threshold_time"),
		endTime: integer("end_time"),
	},
	(t) => ({
		// A given point can only be activated once per terminal per date.
		// Overlap between *different* points on the same terminal+date is
		// rejected in application logic (see lib/presence-schedule.ts).
		unq: unique().on(t.presencePointId, t.terminalId, t.date),
	}),
);

export const presenceLogs = sqliteTable("presence_logs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
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

// Manual, daily-level attendance override for a user on a sheet for a date.
// `presenceLogs` are per presence point; the *daily* conclusion (HADIR/SAKIT/
// IZIN/ALPA) is normally derived automatically, but holders of
// `presence.edit.attendances` can override it here (e.g. mark SICK/PERMIT).
export const attendanceMarks = sqliteTable(
	"attendance_marks",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		deviceUserId: integer("device_user_id")
			.notNull()
			.references(() => deviceUsers.id, { onDelete: "cascade" }),
		sheetId: integer("sheet_id")
			.notNull()
			.references(() => attendanceSheets.id, { onDelete: "cascade" }),
		date: text("date").notNull(), // YYYY-MM-DD
		status: text("status").notNull(), // PRESENT, SICK, PERMIT, ABSENT
		note: text("note"),
		editedByEmail: text("edited_by_email").notNull(),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
	},
	(t) => ({
		unq: unique().on(t.deviceUserId, t.sheetId, t.date),
	}),
);

export const shortLinks = sqliteTable("short_links", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	slug: text("slug").notNull().unique(),
	originalUrl: text("original_url").notNull(),
	createdByEmail: text("created_by_email").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
	clickCount: integer("click_count").notNull().default(0),
});

export const accountPasses = sqliteTable("account_passes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ownerEmail: text("owner_email").notNull().unique(),
	frontDriveFileId: text("front_drive_file_id"),
	backDriveFileId: text("back_drive_file_id"),
	qrPayload: text("qr_payload"),
	walletStatus: text("wallet_status").notNull().default("NOT_READY"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventories = sqliteTable("inventories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventoryMembers = sqliteTable(
	"inventory_members",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
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

export const inventoryItems = sqliteTable("inventory_items", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	inventoryId: integer("inventory_id")
		.notNull()
		.references(() => inventories.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	sku: text("sku"),
	description: text("description"),
	quantity: integer("quantity").notNull().default(0),
	unit: text("unit").notNull().default("pcs"),
	location: text("location"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventoryTransactions = sqliteTable("inventory_transactions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
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
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventoryFiles = sqliteTable("inventory_files", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	inventoryId: integer("inventory_id")
		.notNull()
		.references(() => inventories.id, { onDelete: "cascade" }),
	driveFileId: text("drive_file_id").notNull(),
	name: text("name").notNull(),
	webViewLink: text("web_view_link"),
	thumbnailLink: text("thumbnail_link"),
	uploadedByEmail: text("uploaded_by_email").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventoryItemAttachments = sqliteTable(
	"inventory_item_attachments",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
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
