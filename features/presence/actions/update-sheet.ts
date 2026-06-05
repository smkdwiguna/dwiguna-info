"use server";

import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	sheetTargets,
	presencePoints,
	pointSchedules,
} from "@/lib/db/schema";
import { assignMissingDeviceIds } from "./assign-device-ids";
import { eq, inArray } from "drizzle-orm";
import {
	findAllConflicts,
	minutesToTime,
	type PointScheduleLike,
	type ResolvedWindow,
} from "@/lib/presence-schedule";

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
}

export async function updateAttendanceSheet(payload: UpdateSheetPayload) {
	const db = await getDb();

	try {
		// -- VALIDATE FIRST (neon-http has no interactive tx, so no rollback) --
		// Changing a point's default time can retroactively make already-scheduled
		// dates overlap on a terminal. Recompute the *proposed* world and reject
		// the whole save if any conflict would arise.
		const currentPoints = await db
			.select()
			.from(presencePoints)
			.where(eq(presencePoints.sheetId, payload.sheetId));
		const currentPointIds = currentPoints.map((p) => p.id);
		const incomingPointIds = payload.points
			.filter((p) => p.id)
			.map((p) => p.id as number);
		const idsToDelete = currentPointIds.filter(
			(id) => !incomingPointIds.includes(id),
		);

		const [allPoints, allSchedules] = await Promise.all([
			db.select().from(presencePoints),
			db.select().from(pointSchedules),
		]);

		// Proposed defaults: start from DB, apply this sheet's edits & deletions.
		const proposedDefaults = new Map<number, ResolvedWindow>();
		for (const p of allPoints) {
			proposedDefaults.set(p.id, {
				startTime: p.startTime,
				thresholdTime: p.thresholdTime,
				endTime: p.endTime,
			});
		}
		for (const id of idsToDelete) proposedDefaults.delete(id);
		for (const p of payload.points) {
			if (p.id) {
				proposedDefaults.set(p.id, {
					startTime: p.startTime,
					thresholdTime: p.thresholdTime,
					endTime: p.endTime,
				});
			}
		}

		const deletedSet = new Set(idsToDelete);
		const proposedSchedules: PointScheduleLike[] = allSchedules.filter(
			(s) => !deletedSet.has(s.presencePointId),
		);

		const conflicts = findAllConflicts(proposedSchedules, proposedDefaults);
		if (conflicts.length > 0) {
			const nameById = new Map(allPoints.map((p) => [p.id, p.name]));
			const c = conflicts[0];
			const aName = nameById.get(c.with.presencePointId) ?? "titik";
			throw new Error(
				`Perubahan waktu membuat jadwal bentrok pada ${c.with.date}: ` +
					`${aName} (${minutesToTime(c.otherWindow.startTime)}–${minutesToTime(
						c.otherWindow.endTime,
					)}) tumpang tindih di perangkat yang sama. ` +
					`Sesuaikan jadwal di Agenda dulu sebelum mengubah waktu default.`,
			);
		}

		// -- MUTATE --
		await db
			.update(attendanceSheets)
			.set({ name: payload.name })
			.where(eq(attendanceSheets.id, payload.sheetId));

		// TARGETS (no child relations -> safe to delete and recreate)
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

		// POINTS (upsert to avoid cascading deletes to existing logs/schedules)
		if (idsToDelete.length > 0) {
			await db
				.delete(presencePoints)
				.where(inArray(presencePoints.id, idsToDelete));
		}

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

		return { success: true };
	} catch (error) {
		console.error("Failed to update attendance sheet:", error);
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}
