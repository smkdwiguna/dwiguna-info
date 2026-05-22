"use server";

import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	sheetTargets,
	presencePoints,
} from "@/lib/db/schema";
import { assignMissingDeviceIds } from "./assign-device-ids";
import { eq } from "drizzle-orm";

export async function createAttendanceSheet(name: string) {
	const db = await getDb();

	try {
		// Insert Sheet
		const [sheet] = await db
			.insert(attendanceSheets)
			.values({ name })
			.returning();

		return { success: true, sheetId: sheet.id };
	} catch (error: any) {
		console.error("Failed to create attendance sheet:", error);
		throw new Error(error.message);
	}
}

export async function deleteAttendanceSheet(sheetId: number) {
	const db = await getDb();
	try {
		// Because of onDelete: 'cascade' on the DB level, this will auto-delete targets, points, and schedules linked!
		await db.delete(attendanceSheets).where(eq(attendanceSheets.id, sheetId));
		return { success: true };
	} catch (error: any) {
		console.error("Failed to delete attendance sheet:", error);
		throw new Error(error.message);
	}
}
