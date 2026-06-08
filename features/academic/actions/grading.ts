"use server";

import { getDb } from "@/lib/db";
import {
	academicGradingSheets,
	academicGradingColumns,
	academicGradingScores,
	academicLessons,
	academicTeacherAssignments,
} from "@/lib/db/schema";
import {
	getLivePermissions,
} from "@/features/access-management/actions/require-permission";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function canManageGrading(lessonId: number, orgUnitPath: string) {
	const { session, permissions, isSuperUser } = await getLivePermissions();
	if (isSuperUser || permissions.includes("academic")) return true;

	if (!session?.user?.email) return false;

	const db = await getDb();
	const assignment = await db
		.select()
		.from(academicTeacherAssignments)
		.where(
			and(
				eq(academicTeacherAssignments.teacherEmail, session.user.email),
				eq(academicTeacherAssignments.lessonId, lessonId),
				eq(academicTeacherAssignments.orgUnitPath, orgUnitPath),
			),
		)
		.limit(1)
		.all();

	return assignment.length > 0;
}

export async function getOrCreateGradingSheet(
	lessonId: number,
	orgUnitPath: string,
) {
	const db = await getDb();
	let sheet = await db
		.select()
		.from(academicGradingSheets)
		.where(
			and(
				eq(academicGradingSheets.lessonId, lessonId),
				eq(academicGradingSheets.orgUnitPath, orgUnitPath),
			),
		)
		.limit(1)
		.all();

	if (sheet.length === 0) {
		if (!(await canManageGrading(lessonId, orgUnitPath))) {
			throw new Error("FORBIDDEN");
		}
		sheet = await db
			.insert(academicGradingSheets)
			.values({ lessonId, orgUnitPath })
			.returning();
	}

	return sheet[0];
}

export async function getGradingSheetDataFixed(sheetId: number) {
	const db = await getDb();
	const columns = await db
		.select()
		.from(academicGradingColumns)
		.where(eq(academicGradingColumns.sheetId, sheetId))
		.orderBy(asc(academicGradingColumns.order))
		.all();

	if (columns.length === 0) return { columns, scores: [] };

	const columnIds = columns.map((c) => c.id);
	const scores = await db
		.select()
		.from(academicGradingScores)
		.where(inArray(academicGradingScores.columnId, columnIds))
		.all();

	return { columns, scores };
}

export async function addGradingColumn(sheetId: number, name: string) {
	const db = await getDb();
	const sheet = await db
		.select()
		.from(academicGradingSheets)
		.where(eq(academicGradingSheets.id, sheetId))
		.limit(1)
		.all();
	if (!sheet[0]) throw new Error("Sheet not found");

	if (!(await canManageGrading(sheet[0].lessonId, sheet[0].orgUnitPath))) {
		throw new Error("FORBIDDEN");
	}

	const existingColumns = await db
		.select()
		.from(academicGradingColumns)
		.where(eq(academicGradingColumns.sheetId, sheetId))
		.all();

	const result = await db
		.insert(academicGradingColumns)
		.values({
			sheetId,
			name,
			order: existingColumns.length,
		})
		.returning();

	revalidatePath("/academic/grading");
	return result[0];
}

export async function updateScore(
	columnId: number,
	studentEmail: string,
	score: number,
) {
	const db = await getDb();
	const column = await db
		.select()
		.from(academicGradingColumns)
		.where(eq(academicGradingColumns.id, columnId))
		.limit(1)
		.all();
	if (!column[0]) throw new Error("Column not found");

	const sheet = await db
		.select()
		.from(academicGradingSheets)
		.where(eq(academicGradingSheets.id, column[0].sheetId))
		.limit(1)
		.all();
	if (!sheet[0]) throw new Error("Sheet not found");

	if (!(await canManageGrading(sheet[0].lessonId, sheet[0].orgUnitPath))) {
		throw new Error("FORBIDDEN");
	}

	await db
		.insert(academicGradingScores)
		.values({ columnId, studentEmail, score })
		.onConflictDoUpdate({
			target: [academicGradingScores.columnId, academicGradingScores.studentEmail],
			set: { score, updatedAt: sql`(CURRENT_TIMESTAMP)` },
		});
}

export async function deleteGradingColumn(columnId: number) {
	const db = await getDb();
	const column = await db
		.select()
		.from(academicGradingColumns)
		.where(eq(academicGradingColumns.id, columnId))
		.limit(1)
		.all();
	if (!column[0]) return;

	const sheet = await db
		.select()
		.from(academicGradingSheets)
		.where(eq(academicGradingSheets.id, column[0].sheetId))
		.limit(1)
		.all();
	if (!sheet[0]) return;

	if (!(await canManageGrading(sheet[0].lessonId, sheet[0].orgUnitPath))) {
		throw new Error("FORBIDDEN");
	}

	await db.delete(academicGradingColumns).where(eq(academicGradingColumns.id, columnId));
	revalidatePath("/academic/grading");
}

export async function hasAnyGrades(studentEmail: string) {
	const db = await getDb();
	const scores = await db
		.select()
		.from(academicGradingScores)
		.where(eq(academicGradingScores.studentEmail, studentEmail))
		.limit(1)
		.all();
	return scores.length > 0;
}
