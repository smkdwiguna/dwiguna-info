"use server";

import { getDb } from "@/lib/db";
import {
	academicTeacherAssignments,
	academicLessons,
} from "@/lib/db/schema";
import { requirePermission } from "@/features/access-management/actions/require-permission";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTeacherAssignments() {
	const db = await getDb();
	return db
		.select({
			id: academicTeacherAssignments.id,
			teacherEmail: academicTeacherAssignments.teacherEmail,
			lessonId: academicTeacherAssignments.lessonId,
			lessonName: academicLessons.name,
			orgUnitPath: academicTeacherAssignments.orgUnitPath,
		})
		.from(academicTeacherAssignments)
		.leftJoin(
			academicLessons,
			eq(academicTeacherAssignments.lessonId, academicLessons.id),
		)
		.all();
}

export async function assignTeacher(data: {
	teacherEmail: string;
	lessonId: number;
	orgUnitPath: string;
}) {
	await requirePermission("academic");
	const db = await getDb();
	const result = await db
		.insert(academicTeacherAssignments)
		.values(data)
		.returning();
	revalidatePath("/academic");
	return result[0];
}

export async function removeTeacherAssignment(id: number) {
	await requirePermission("academic");
	const db = await getDb();
	await db
		.delete(academicTeacherAssignments)
		.where(eq(academicTeacherAssignments.id, id));
	revalidatePath("/academic");
}

export async function getLessonsForTeacher(email: string) {
	const db = await getDb();
	return db
		.select({
			lessonId: academicLessons.id,
			lessonName: academicLessons.name,
			orgUnitPath: academicTeacherAssignments.orgUnitPath,
		})
		.from(academicTeacherAssignments)
		.innerJoin(
			academicLessons,
			eq(academicTeacherAssignments.lessonId, academicLessons.id),
		)
		.where(eq(academicTeacherAssignments.teacherEmail, email))
		.all();
}
