"use server";

import { getDb } from "@/lib/db";
import {
	academicTimetable,
	academicTimetableOverrides,
	academicLessons,
	academicTeacherAssignments,
} from "@/lib/db/schema";
import {
	requirePermission,
	getLivePermissions,
} from "@/features/access-management/actions/require-permission";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTimetable(orgUnitPath?: string) {
	const db = await getDb();
	let query = db
		.select({
			id: academicTimetable.id,
			lessonId: academicTimetable.lessonId,
			lessonName: academicLessons.name,
			orgUnitPath: academicTimetable.orgUnitPath,
			dayOfWeek: academicTimetable.dayOfWeek,
			startTime: academicTimetable.startTime,
			endTime: academicTimetable.endTime,
		})
		.from(academicTimetable)
		.leftJoin(academicLessons, eq(academicTimetable.lessonId, academicLessons.id));

	if (orgUnitPath) {
		query = query.where(eq(academicTimetable.orgUnitPath, orgUnitPath)) as any;
	}

	return query.all();
}

async function canManageTimetable(orgUnitPath: string) {
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
				eq(academicTeacherAssignments.orgUnitPath, orgUnitPath),
			),
		)
		.limit(1)
		.all();

	return assignment.length > 0;
}

export async function createTimetableEntry(data: {
	lessonId: number;
	orgUnitPath: string;
	dayOfWeek: number;
	startTime: number;
	endTime: number;
}) {
	if (!(await canManageTimetable(data.orgUnitPath))) {
		throw new Error("FORBIDDEN");
	}
	const db = await getDb();
	const result = await db.insert(academicTimetable).values(data).returning();
	revalidatePath("/academic/timetable");
	return result[0];
}

export async function deleteTimetableEntry(id: number) {
	const db = await getDb();
	const entry = await db
		.select()
		.from(academicTimetable)
		.where(eq(academicTimetable.id, id))
		.limit(1)
		.all();
	if (!entry[0]) return;

	if (!(await canManageTimetable(entry[0].orgUnitPath))) {
		throw new Error("FORBIDDEN");
	}

	await db.delete(academicTimetable).where(eq(academicTimetable.id, id));
	revalidatePath("/academic/timetable");
}

export async function getTimetableOverrides(orgUnitPath?: string, date?: string) {
	const db = await getDb();
	let query = db
		.select({
			id: academicTimetableOverrides.id,
			orgUnitPath: academicTimetableOverrides.orgUnitPath,
			date: academicTimetableOverrides.date,
			lessonId: academicTimetableOverrides.lessonId,
			lessonName: academicLessons.name,
			startTime: academicTimetableOverrides.startTime,
			endTime: academicTimetableOverrides.endTime,
			isCancelled: academicTimetableOverrides.isCancelled,
			note: academicTimetableOverrides.note,
		})
		.from(academicTimetableOverrides)
		.leftJoin(
			academicLessons,
			eq(academicTimetableOverrides.lessonId, academicLessons.id),
		);

	const filters = [];
	if (orgUnitPath) {
		filters.push(
			or(
				eq(academicTimetableOverrides.orgUnitPath, orgUnitPath),
				eq(academicTimetableOverrides.orgUnitPath, "/"),
			),
		);
	}
	if (date) {
		filters.push(eq(academicTimetableOverrides.date, date));
	}

	if (filters.length > 0) {
		query = query.where(and(...filters)) as any;
	}

	return query.all();
}

export async function createTimetableOverride(data: {
	orgUnitPath: string;
	date: string;
	lessonId?: number;
	startTime?: number;
	endTime?: number;
	isCancelled: boolean;
	note?: string;
}) {
	if (!(await canManageTimetable(data.orgUnitPath))) {
		throw new Error("FORBIDDEN");
	}
	const db = await getDb();
	const result = await db
		.insert(academicTimetableOverrides)
		.values(data)
		.returning();
	revalidatePath("/academic/timetable");
	return result[0];
}
