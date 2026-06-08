import {
	sqliteTable,
	text,
	integer,
	real,
	unique,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Lessons and extracurricular activities.
 */
export const academicLessons = sqliteTable("academic_lessons", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	// 'INTRACURRICULAR' | 'EXTRACURRICULAR'
	type: text("type").notNull().default("INTRACURRICULAR"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Maps teachers to specific lessons and classes (Org Units).
 */
export const academicTeacherAssignments = sqliteTable(
	"academic_teacher_assignments",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		teacherEmail: text("teacher_email").notNull(),
		lessonId: integer("lesson_id")
			.notNull()
			.references(() => academicLessons.id, { onDelete: "cascade" }),
		orgUnitPath: text("org_unit_path").notNull(),
	},
	(t) => ({
		unq: unique().on(t.teacherEmail, t.lessonId, t.orgUnitPath),
	}),
);

/**
 * Weekly recurring timetable.
 */
export const academicTimetable = sqliteTable("academic_timetable", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	lessonId: integer("lesson_id")
		.notNull()
		.references(() => academicLessons.id, { onDelete: "cascade" }),
	orgUnitPath: text("org_unit_path").notNull(),
	dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
	startTime: integer("start_time").notNull(), // Minutes from midnight
	endTime: integer("end_time").notNull(), // Minutes from midnight
});

/**
 * Specific date overrides (holidays, schedule changes, etc).
 */
export const academicTimetableOverrides = sqliteTable(
	"academic_timetable_overrides",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		orgUnitPath: text("org_unit_path").notNull(), // can be '/' for all
		date: text("date").notNull(), // YYYY-MM-DD
		lessonId: integer("lesson_id").references(() => academicLessons.id, {
			onDelete: "cascade",
		}),
		startTime: integer("start_time"),
		endTime: integer("end_time"),
		isCancelled: integer("is_cancelled", { mode: "boolean" })
			.notNull()
			.default(false),
		note: text("note"),
	},
);

/**
 * A grading sheet groups columns for a specific lesson and class.
 */
export const academicGradingSheets = sqliteTable(
	"academic_grading_sheets",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		lessonId: integer("lesson_id")
			.notNull()
			.references(() => academicLessons.id, { onDelete: "cascade" }),
		orgUnitPath: text("org_unit_path").notNull(),
	},
	(t) => ({
		unq: unique().on(t.lessonId, t.orgUnitPath),
	}),
);

/**
 * Individual assessment columns within a grading sheet (e.g., "Quiz 1", "Midterm").
 */
export const academicGradingColumns = sqliteTable("academic_grading_columns", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sheetId: integer("sheet_id")
		.notNull()
		.references(() => academicGradingSheets.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	order: integer("order").notNull().default(0),
});

/**
 * Student scores for a specific column.
 */
export const academicGradingScores = sqliteTable(
	"academic_grading_scores",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		columnId: integer("column_id")
			.notNull()
			.references(() => academicGradingColumns.id, { onDelete: "cascade" }),
		studentEmail: text("student_email").notNull(),
		score: real("score").notNull().default(0),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
	},
	(t) => ({
		unq: unique().on(t.columnId, t.studentEmail),
	}),
);
