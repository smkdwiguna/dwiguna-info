"use server";

import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	sheetTargets,
	presencePoints,
	schedules,
} from "@/lib/db/schema";
import { assignMissingDeviceIds } from "./assign-device-ids";
import { eq, inArray } from "drizzle-orm";

interface UpdateSheetPayload {
	sheetId: number;
	name: string;
	targets: { id?: number; orgUnitPath: string; alias?: string }[];
	points: {
		id?: number;
		name: string;
		startTime: number;
		thresholdTime: number;
		endTime: number;
	}[];
	schedules: {
		id?: number;
		terminalId: string;
		date: string;
	}[];
}

export async function updateAttendanceSheet(payload: UpdateSheetPayload) {
	const db = await getDb();

	try {
		// Update Sheet Name
		await db
			.update(attendanceSheets)
			.set({ name: payload.name })
			.where(eq(attendanceSheets.id, payload.sheetId));

		// -- TARGETS (Safe to delete and recreate because they have no child relations) --
		await db
			.delete(sheetTargets)
			.where(eq(sheetTargets.sheetId, payload.sheetId));

		for (const target of payload.targets) {
			const fallbackAlias =
				target.orgUnitPath.split("/").filter(Boolean).pop() ||
				target.orgUnitPath;
			await db.insert(sheetTargets).values({
				sheetId: payload.sheetId,
				orgUnitPath: target.orgUnitPath,
				alias: target.alias || fallbackAlias,
			});

			// Trigger Just-In-Time ID Provisioning for anyone in this path!
			await assignMissingDeviceIds(target.orgUnitPath);
		}

		// -- POINTS (Must upsert to avoid cascading deletes to existing logs) --
		const currentPoints = await db
			.select()
			.from(presencePoints)
			.where(eq(presencePoints.sheetId, payload.sheetId));
		const currentPointIds = currentPoints.map((p) => p.id);
		const incomingPointIds = payload.points
			.filter((p) => p.id)
			.map((p) => p.id as number);

		// 1. Delete points that were removed in the UI
		const idsToDelete = currentPointIds.filter(
			(id) => !incomingPointIds.includes(id),
		);
		if (idsToDelete.length > 0) {
			await db
				.delete(presencePoints)
				.where(inArray(presencePoints.id, idsToDelete));
		}

		// 2. Update existing & Insert new
		for (const point of payload.points) {
			if (point.id) {
				await db
					.update(presencePoints)
					.set({
						name: point.name,
						startTime: point.startTime,
						thresholdTime: point.thresholdTime,
						endTime: point.endTime,
					})
					.where(eq(presencePoints.id, point.id));
			} else {
				await db.insert(presencePoints).values({
					sheetId: payload.sheetId,
					name: point.name,
					startTime: point.startTime,
					thresholdTime: point.thresholdTime,
					endTime: point.endTime,
				});
			}
		}

		// -- SCHEDULES (Safe to delete and recreate) --
		await db
			.delete(schedules)
			.where(eq(schedules.sheetId, payload.sheetId));

		for (const schedule of payload.schedules) {
			await db.insert(schedules).values({
				sheetId: payload.sheetId,
				terminalId: schedule.terminalId,
				date: schedule.date,
			});
		}

		return { success: true };
	} catch (error: any) {
		console.error("Failed to update attendance sheet:", error);
		throw new Error(error.message);
	}
}
