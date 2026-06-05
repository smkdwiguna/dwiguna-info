/**
 * Shared scheduling logic for presence points.
 *
 * The hard invariant the whole system relies on: on a single terminal, on a
 * single date, at most one presence point may be "open" at any instant. That
 * lets the device endpoint deterministically pick which point a fingerprint
 * scan belongs to. We enforce it as: no two scheduled point-instances on the
 * same (terminal, date) may have overlapping [startTime, endTime) windows.
 *
 * This module is pure (no DB / no React) so it can run identically on the
 * client (to disable conflicting actions) and on the server (hard guarantee).
 */

export interface PointDefaults {
	id: number;
	startTime: number;
	thresholdTime: number;
	endTime: number;
}

/** A scheduled activation of one point on one terminal for one date. */
export interface PointScheduleLike {
	id?: number;
	presencePointId: number;
	terminalId: string;
	date: string; // YYYY-MM-DD
	// Per-day overrides in minutes from midnight; null = use point default.
	startTime: number | null;
	thresholdTime: number | null;
	endTime: number | null;
}

export interface ResolvedWindow {
	startTime: number;
	thresholdTime: number;
	endTime: number;
}

export function minutesToTime(minutes: number): string {
	const safe = ((Math.round(minutes) % 1440) + 1440) % 1440;
	const h = Math.floor(safe / 60)
		.toString()
		.padStart(2, "0");
	const m = (safe % 60).toString().padStart(2, "0");
	return `${h}:${m}`;
}

export function timeToMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return (h || 0) * 60 + (m || 0);
}

/** Resolve the effective window of a schedule, applying overrides over defaults. */
export function resolveWindow(
	schedule: Pick<PointScheduleLike, "startTime" | "thresholdTime" | "endTime">,
	defaults: ResolvedWindow,
): ResolvedWindow {
	return {
		startTime: schedule.startTime ?? defaults.startTime,
		thresholdTime: schedule.thresholdTime ?? defaults.thresholdTime,
		endTime: schedule.endTime ?? defaults.endTime,
	};
}

/** Two windows overlap when they share any instant. Touching edges is allowed. */
export function windowsOverlap(a: ResolvedWindow, b: ResolvedWindow): boolean {
	return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * A window is internally valid when start < threshold <= end (threshold is the
 * lateness boundary and must sit inside the open window).
 */
export function isWindowValid(w: ResolvedWindow): boolean {
	return (
		Number.isFinite(w.startTime) &&
		Number.isFinite(w.thresholdTime) &&
		Number.isFinite(w.endTime) &&
		w.startTime < w.endTime &&
		w.thresholdTime >= w.startTime &&
		w.thresholdTime <= w.endTime
	);
}

export interface ScheduleConflict {
	with: PointScheduleLike;
	candidateWindow: ResolvedWindow;
	otherWindow: ResolvedWindow;
}

/**
 * Find every existing schedule that conflicts with `candidate`.
 *
 * Conflicts are only possible on the same (terminal, date). A schedule never
 * conflicts with itself (matched by `id`, or by identical point when ids are
 * absent, e.g. while editing a not-yet-persisted row).
 */
export function findScheduleConflicts(
	candidate: PointScheduleLike,
	existing: PointScheduleLike[],
	defaultsByPointId: Map<number, ResolvedWindow>,
): ScheduleConflict[] {
	const candidateDefaults = defaultsByPointId.get(candidate.presencePointId);
	if (!candidateDefaults) return [];
	const candidateWindow = resolveWindow(candidate, candidateDefaults);

	const conflicts: ScheduleConflict[] = [];
	for (const other of existing) {
		if (other.terminalId !== candidate.terminalId) continue;
		if (other.date !== candidate.date) continue;
		const isSame =
			(candidate.id != null && other.id === candidate.id) ||
			(candidate.id == null &&
				other.id == null &&
				other.presencePointId === candidate.presencePointId);
		if (isSame) continue;

		const otherDefaults = defaultsByPointId.get(other.presencePointId);
		if (!otherDefaults) continue;
		const otherWindow = resolveWindow(other, otherDefaults);

		if (windowsOverlap(candidateWindow, otherWindow)) {
			conflicts.push({ with: other, candidateWindow, otherWindow });
		}
	}
	return conflicts;
}

/**
 * Current wall-clock in the attendance timezone (WIB / Asia/Jakarta), as a
 * YYYY-MM-DD date key plus minutes-from-midnight. Used by the device endpoint
 * to decide which point (if any) is open right now.
 */
export const ATTENDANCE_TIME_ZONE = "Asia/Jakarta";

export function nowInJakarta(epochMs: number = Date.now()): {
	dateKey: string;
	minutes: number;
} {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: ATTENDANCE_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(new Date(epochMs));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
	const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
	// Intl may emit "24" for midnight in some runtimes; normalize to 0.
	const hour = Number(get("hour")) % 24;
	const minutes = hour * 60 + Number(get("minute"));
	return { dateKey, minutes };
}

/**
 * Among already (terminal, date)-filtered schedules, return the one whose
 * resolved window is open at `minutes` (start <= minutes < end). The conflict
 * invariant guarantees at most one match, so the first hit is returned.
 */
export function findOpenSchedule<T extends PointScheduleLike>(
	schedules: T[],
	defaultsByPointId: Map<number, ResolvedWindow>,
	minutes: number,
): { schedule: T; window: ResolvedWindow } | null {
	for (const s of schedules) {
		const defaults = defaultsByPointId.get(s.presencePointId);
		if (!defaults) continue;
		const window = resolveWindow(s, defaults);
		if (minutes >= window.startTime && minutes < window.endTime) {
			return { schedule: s, window };
		}
	}
	return null;
}

/**
 * Validate a full set of schedules at once and return all conflicting pairs.
 * Used server-side as the final guarantee, and when a point's default times
 * change (which can retroactively make previously-fine schedules overlap).
 */
export function findAllConflicts(
	schedules: PointScheduleLike[],
	defaultsByPointId: Map<number, ResolvedWindow>,
): ScheduleConflict[] {
	const conflicts: ScheduleConflict[] = [];
	for (let i = 0; i < schedules.length; i++) {
		const a = schedules[i];
		const aDefaults = defaultsByPointId.get(a.presencePointId);
		if (!aDefaults) continue;
		const aWindow = resolveWindow(a, aDefaults);
		for (let j = i + 1; j < schedules.length; j++) {
			const b = schedules[j];
			if (a.terminalId !== b.terminalId || a.date !== b.date) continue;
			const bDefaults = defaultsByPointId.get(b.presencePointId);
			if (!bDefaults) continue;
			const bWindow = resolveWindow(b, bDefaults);
			if (windowsOverlap(aWindow, bWindow)) {
				conflicts.push({
					with: b,
					candidateWindow: aWindow,
					otherWindow: bWindow,
				});
			}
		}
	}
	return conflicts;
}
