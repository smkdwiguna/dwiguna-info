"use server";

import { getDb } from "@/lib/db";
import { academicLessons } from "@/lib/db/schema";
import { requirePermission } from "@/features/access-management/actions/require-permission";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getLessons() {
	const db = await getDb();
	return db.select().from(academicLessons).all();
}

export async function createLesson(data: {
	name: string;
	type: "INTRACURRICULAR" | "EXTRACURRICULAR";
}) {
	await requirePermission("academic");
	const db = await getDb();
	const result = await db.insert(academicLessons).values(data).returning();
	revalidatePath("/academic");
	return result[0];
}

export async function updateLesson(
	id: number,
	data: { name?: string; type?: "INTRACURRICULAR" | "EXTRACURRICULAR" },
) {
	await requirePermission("academic");
	const db = await getDb();
	const result = await db
		.update(academicLessons)
		.set(data)
		.where(eq(academicLessons.id, id))
		.returning();
	revalidatePath("/academic");
	return result[0];
}

export async function deleteLesson(id: number) {
	await requirePermission("academic");
	const db = await getDb();
	await db.delete(academicLessons).where(eq(academicLessons.id, id));
	revalidatePath("/academic");
}
