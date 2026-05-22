import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

export const deviceUsers = sqliteTable('device_users', {
	// Hardware limit ID from 0 to 999
	id: integer('id').primaryKey(),
	// Google Workspace Email to link the user
	email: text('email').notNull().unique(),
	// Biometric data (if synced from terminal to database)
	fingerprint: text('fingerprint'),
});

export const terminals = sqliteTable('terminals', {
	id: text('id').primaryKey(), // MAC Address or UUID
	name: text('name').notNull(),
	status: text('status').notNull().default('INHERIT'), // WAIT_ENROLL, WAIT_FETCH, etc.
	password: text('password'),
	timeout: integer('timeout').default(0),
	// JSON field for dynamic state (like whose ID is being enrolled right now)
	metadata: text('metadata'),
});

export const attendanceSheets = sqliteTable('attendance_sheets', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
});

export const sheetTargets = sqliteTable('sheet_targets', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	sheetId: integer('sheet_id')
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: 'cascade' }),
	orgUnitPath: text('org_unit_path').notNull(), // e.g., /Siswa/2026/PPLG-1
	alias: text('alias').notNull(), // e.g., "10 PPLG 1"
});

export const presencePoints = sqliteTable('presence_points', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	sheetId: integer('sheet_id')
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // e.g., "Masuk Pagi"
	// Time in minutes from midnight (0 to 1440)
	startTime: integer('start_time').notNull(),
	thresholdTime: integer('threshold_time').notNull(),
	endTime: integer('end_time').notNull(),
});

export const schedules = sqliteTable('schedules', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	terminalId: text('terminal_id')
		.notNull()
		.references(() => terminals.id, { onDelete: 'cascade' }),
	sheetId: integer('sheet_id')
		.notNull()
		.references(() => attendanceSheets.id, { onDelete: 'cascade' }),
	date: text('date').notNull(), // YYYY-MM-DD format
}, (t) => ({
	// One terminal can technically have multiple sheets on the same date,
	// but we must check in application logic that their presencePoints don't overlap!
	unq: unique().on(t.terminalId, t.sheetId, t.date),
}));

export const presenceLogs = sqliteTable('presence_logs', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	deviceUserId: integer('device_user_id')
		.notNull()
		.references(() => deviceUsers.id, { onDelete: 'cascade' }),
	presencePointId: integer('presence_point_id')
		.notNull()
		.references(() => presencePoints.id, { onDelete: 'cascade' }),
	terminalId: text('terminal_id')
		.notNull()
		.references(() => terminals.id, { onDelete: 'cascade' }),
	timestamp: integer('timestamp').notNull(), // Epoch time
	date: text('date').notNull(), // YYYY-MM-DD for easier querying
	status: text('status').notNull(), // PRESENT, LATE, ABSENT, SICK, PERMIT
});
