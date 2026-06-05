"use server";

import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	pointSchedules,
	presencePoints,
	terminals,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/features/access-management/actions/require-permission";
import {
	findScheduleConflicts,
	isWindowValid,
	minutesToTime,
	resolveWindow,
	type PointScheduleLike,
	type ResolvedWindow,
} from "@/lib/presence-schedule";

export interface AgendaPoint {
	id: number;
	sheetId: number;
	name: string;
	startTime: number;
	thresholdTime: number;
	endTime: number;
}

export interface AgendaScheduleRow {
	id: number;
	presencePointId: number;
	terminalId: string;
	date: string;
	startTime: number | null;
	thresholdTime: number | null;
	endTime: number | null;
}

export interface AgendaData {
	sheets: { id: number; name: string }[];
	points: AgendaPoint[];
	terminals: { id: string; name: string }[];
	schedules: AgendaScheduleRow[];
}

export async function getAgendaData(): Promise<AgendaData> {
	await requirePermission("presence.edit.sheets");
	const db = await getDb();
	const [sheets, points, allTerminals, schedules] = await Promise.all([
		db.select().from(attendanceSheets),
		db.select().from(presencePoints),
		db.select().from(terminals),
		db.select().from(pointSchedules),
	]);

	return {
		sheets: sheets.map((s) => ({ id: s.id, name: s.name })),
		points: points.map((p) => ({
			id: p.id,
			sheetId: p.sheetId,
			name: p.name,
			startTime: p.startTime,
			thresholdTime: p.thresholdTime,
			endTime: p.endTime,
		})),
		terminals: allTerminals.map((t) => ({ id: t.id, name: t.name })),
		schedules,
	};
}

async function loadDefaults(): Promise<Map<number, ResolvedWindow>> {
	const db = await getDb();
	const points = await db.select().from(presencePoints);
	return new Map(
		points.map((p) => [
			p.id,
			{
				startTime: p.startTime,
				thresholdTime: p.thresholdTime,
				endTime: p.endTime,
			},
		]),
	);
}

function describeConflict(
	other: PointScheduleLike,
	pointNameById: Map<number, string>,
	otherWindow: ResolvedWindow,
): string {
	const name = pointNameById.get(other.presencePointId) ?? "titik lain";
	return `${name} (${minutesToTime(otherWindow.startTime)}–${minutesToTime(
		otherWindow.endTime,
	)})`;
}

export interface SavePointScheduleInput {
	id?: number;
	presencePointId: number;
	terminalId: string;
	date: string;
	startTime: number | null;
	thresholdTime: number | null;
	endTime: number | null;
}

export async function savePointSchedule(input: SavePointScheduleInput) {
	await requirePermission("presence.edit.sheets");
	const db = await getDb();

	const defaults = await loadDefaults();
	const pointDefaults = defaults.get(input.presencePointId);
	if (!pointDefaults) throw new Error("Titik kehadiran tidak ditemukan.");

	const candidate: PointScheduleLike = {
		id: input.id,
		presencePointId: input.presencePointId,
		terminalId: input.terminalId,
		date: input.date,
		startTime: input.startTime,
		thresholdTime: input.thresholdTime,
		endTime: input.endTime,
	};

	const window = resolveWindow(candidate, pointDefaults);
	if (!isWindowValid(window)) {
		throw new Error(
			"Rentang waktu tidak valid (mulai < terlambat ≤ tutup).",
		);
	}

	const existing = await db.select().from(pointSchedules);
	const conflicts = findScheduleConflicts(candidate, existing, defaults);
	if (conflicts.length > 0) {
		const points = await db.select().from(presencePoints);
		const nameById = new Map(points.map((p) => [p.id, p.name]));
		const first = conflicts[0];
		throw new Error(
			`Bentrok dengan ${describeConflict(
				first.with,
				nameById,
				first.otherWindow,
			)} di perangkat yang sama pada ${input.date}.`,
		);
	}

	if (input.id) {
		await db
			.update(pointSchedules)
			.set({
				presencePointId: input.presencePointId,
				terminalId: input.terminalId,
				date: input.date,
				startTime: input.startTime,
				thresholdTime: input.thresholdTime,
				endTime: input.endTime,
			})
			.where(eq(pointSchedules.id, input.id));
	} else {
		await db.insert(pointSchedules).values({
			presencePointId: input.presencePointId,
			terminalId: input.terminalId,
			date: input.date,
			startTime: input.startTime,
			thresholdTime: input.thresholdTime,
			endTime: input.endTime,
		});
	}

	revalidatePath("/presence/agenda");
	return { success: true };
}

export async function removePointSchedule(id: number) {
	await requirePermission("presence.edit.sheets");
	const db = await getDb();
	await db.delete(pointSchedules).where(eq(pointSchedules.id, id));
	revalidatePath("/presence/agenda");
	return { success: true };
}

export interface BulkScheduleInput {
	presencePointId: number;
	terminalId: string;
	dates: string[];
	startTime: number | null;
	thresholdTime: number | null;
	endTime: number | null;
}

/**
 * Activate a point on a terminal across many dates at once. Dates that would
 * conflict (or already exist) are skipped and reported back, the rest inserted.
 */
export async function bulkSetPointSchedules(input: BulkScheduleInput) {
	await requirePermission("presence.edit.sheets");
	const db = await getDb();

	const defaults = await loadDefaults();
	const pointDefaults = defaults.get(input.presencePointId);
	if (!pointDefaults) throw new Error("Titik kehadiran tidak ditemukan.");

	const window = resolveWindow(input, pointDefaults);
	if (!isWindowValid(window)) {
		throw new Error("Rentang waktu tidak valid (mulai < terlambat ≤ tutup).");
	}

	const existing = await db.select().from(pointSchedules);
	const working: PointScheduleLike[] = [...existing];

	const added: string[] = [];
	const skipped: { date: string; reason: string }[] = [];

	for (const date of input.dates) {
		const candidate: PointScheduleLike = {
			presencePointId: input.presencePointId,
			terminalId: input.terminalId,
			date,
			startTime: input.startTime,
			thresholdTime: input.thresholdTime,
			endTime: input.endTime,
		};

		const duplicate = working.some(
			(s) =>
				s.presencePointId === input.presencePointId &&
				s.terminalId === input.terminalId &&
				s.date === date,
		);
		if (duplicate) {
			skipped.push({ date, reason: "sudah ada" });
			continue;
		}

		const conflicts = findScheduleConflicts(candidate, working, defaults);
		if (conflicts.length > 0) {
			skipped.push({ date, reason: "bentrok" });
			continue;
		}

		const [inserted] = await db
			.insert(pointSchedules)
			.values({
				presencePointId: input.presencePointId,
				terminalId: input.terminalId,
				date,
				startTime: input.startTime,
				thresholdTime: input.thresholdTime,
				endTime: input.endTime,
			})
			.returning();
		working.push({ ...candidate, id: inserted.id });
		added.push(date);
	}

	revalidatePath("/presence/agenda");
	return { success: true, added, skipped };
}
