import { getDb } from "@/lib/db";
import {
	deviceUsers,
	pointSchedules,
	presenceLogs,
	presencePoints,
	terminals,
} from "@/lib/db/schema";
import { buildDevicePhotoHex } from "@/lib/device-user-photo";
import { getAdminService, type GoogleUserRecord } from "@/lib/google-api";
import { loadGoogleUserPhotoBytes } from "@/lib/google-user-photo";
import { verifyDeviceRequest } from "@/lib/device-auth";
import {
	formatTerminalCommand,
	hasTerminalPendingCommand,
	isTerminalIdle,
} from "@/lib/terminal-command";
import {
	findOpenSchedule,
	nowInJakarta,
	type PointScheduleLike,
	type ResolvedWindow,
} from "@/lib/presence-schedule";
import { and, eq } from "drizzle-orm";

const LINE_BREAK_REGEX = /\r?\n/;

function sanitizeField(value?: string) {
	if (!value) return "";
	return value.replace(/[;\r\n]/g, " ").trim();
}

async function resolveUserPresentation(deviceUserId: number) {
	const db = await getDb();
	const [deviceUser] = await db
		.select()
		.from(deviceUsers)
		.where(eq(deviceUsers.id, deviceUserId));

	if (!deviceUser?.email) {
		return { name: "", photoHex: "" };
	}

	let name = deviceUser.email;
	let photoBytes: Uint8Array | null = null;
	let googleUser: GoogleUserRecord | undefined;

	try {
		const userResponse = await getAdminService().users.get({
			userKey: deviceUser.email,
			projection: "basic",
		});
		googleUser = userResponse.data;
		name = googleUser.name?.fullName || deviceUser.email;
	} catch (error) {
		console.error("[device-route] failed to resolve user name", error);
	}

	photoBytes = await loadGoogleUserPhotoBytes(deviceUser.email, googleUser);

	const photoHex = await buildDevicePhotoHex(name, photoBytes);
	return { name: sanitizeField(name), photoHex };
}

function parseSyncQueue(raw?: string | null): number[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) return parsed;
	} catch {}
	return [];
}

type Db = Awaited<ReturnType<typeof getDb>>;

type AttendanceResult = { ok: true } | { ok: false; message: string };

/**
 * Record a fingerprint scan as attendance, if a presence point is currently
 * open on this terminal. Returns a rejection message otherwise so the device
 * can show its "Ditolak" screen (via ERR;<message>). Recording is idempotent
 * per (user, point, date) so re-scanning within the window is harmless.
 */
async function recordAttendanceScan(
	db: Db,
	terminalId: string,
	deviceUserId: number,
	epochMs: number,
): Promise<AttendanceResult> {
	const { dateKey, minutes } = nowInJakarta(epochMs);

	const rows = await db
		.select({
			presencePointId: pointSchedules.presencePointId,
			startTime: pointSchedules.startTime,
			thresholdTime: pointSchedules.thresholdTime,
			endTime: pointSchedules.endTime,
			defStart: presencePoints.startTime,
			defThreshold: presencePoints.thresholdTime,
			defEnd: presencePoints.endTime,
		})
		.from(pointSchedules)
		.innerJoin(
			presencePoints,
			eq(pointSchedules.presencePointId, presencePoints.id),
		)
		.where(
			and(
				eq(pointSchedules.terminalId, terminalId),
				eq(pointSchedules.date, dateKey),
			),
		);

	if (rows.length === 0) {
		return { ok: false, message: "Tidak ada sesi kehadiran" };
	}

	const defaultsByPointId = new Map<number, ResolvedWindow>();
	const schedules: PointScheduleLike[] = [];
	let minStart = Number.POSITIVE_INFINITY;
	let maxEnd = Number.NEGATIVE_INFINITY;
	for (const r of rows) {
		defaultsByPointId.set(r.presencePointId, {
			startTime: r.defStart,
			thresholdTime: r.defThreshold,
			endTime: r.defEnd,
		});
		schedules.push({
			presencePointId: r.presencePointId,
			terminalId,
			date: dateKey,
			startTime: r.startTime,
			thresholdTime: r.thresholdTime,
			endTime: r.endTime,
		});
		minStart = Math.min(minStart, r.startTime ?? r.defStart);
		maxEnd = Math.max(maxEnd, r.endTime ?? r.defEnd);
	}

	const open = findOpenSchedule(schedules, defaultsByPointId, minutes);
	if (!open) {
		if (minutes < minStart) return { ok: false, message: "Belum waktunya" };
		if (minutes >= maxEnd) return { ok: false, message: "Sudah ditutup" };
		return { ok: false, message: "Di luar jam presensi" };
	}

	const status = minutes <= open.window.thresholdTime ? "PRESENT" : "LATE";

	const [existing] = await db
		.select({ id: presenceLogs.id })
		.from(presenceLogs)
		.where(
			and(
				eq(presenceLogs.deviceUserId, deviceUserId),
				eq(presenceLogs.presencePointId, open.schedule.presencePointId),
				eq(presenceLogs.date, dateKey),
			),
		);

	if (!existing) {
		await db.insert(presenceLogs).values({
			deviceUserId,
			presencePointId: open.schedule.presencePointId,
			terminalId,
			timestamp: Math.floor(epochMs / 1000),
			date: dateKey,
			status,
		});
	}

	return { ok: true };
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ deviceId: string }> },
) {
	const resolvedParams = await params;
	const auth = await verifyDeviceRequest(request, resolvedParams.deviceId);
	if (!auth.ok || !auth.terminal) {
		return new Response(
			`ERR;${sanitizeField(auth.message || "Unauthorized")}`,
			{
				status: auth.status || 401,
				headers: { "content-type": "text/plain; charset=utf-8" },
			},
		);
	}

	const bodyText = auth.bodyText || "";
	const lines = bodyText
		.split(LINE_BREAK_REGEX)
		.map((line) => line.trim())
		.filter(Boolean);

	const db = await getDb();
	let hasAck = false;
	let searchedId: number | null = null;
	let enrolledTemplate: { fid: number; templateHex: string } | null = null;

	for (const line of lines) {
		const [type, ...parts] = line.split(";");
		if (!type) continue;

		if (type === "A") {
			hasAck = true;
			continue;
		}

		if (type === "8") {
			const fid = Number(parts[0]);
			if (Number.isFinite(fid)) {
				searchedId = fid;
				continue;
			}
		}

		if (type === "9") {
			const fid = Number(parts[0]);
			const templateHex = parts[1] || "";
			if (Number.isFinite(fid) && templateHex) {
				enrolledTemplate = { fid, templateHex };
				continue;
			}
		}
	}

	const now = Math.floor(Date.now() / 1000);
	let storedStatus = auth.terminal.status || "0";
	let storedMetadata = auth.terminal.metadata ?? null;
	const syncQueue = parseSyncQueue(auth.terminal.syncQueue);

	// Update lastSeenAt in timeout column
	await db
		.update(terminals)
		.set({ timeout: now })
		.where(eq(terminals.id, auth.terminal.id));

	// Handle enrolled template from device (side effect; does not clear pending commands)
	if (enrolledTemplate) {
		await db
			.update(deviceUsers)
			.set({ fingerprint: enrolledTemplate.templateHex })
			.where(eq(deviceUsers.id, enrolledTemplate.fid));
	}

	// Handle ACK: clear the pending command in DB
	if (hasAck && hasTerminalPendingCommand(storedStatus)) {
		if (storedStatus === "3" && syncQueue.length > 0) {
			syncQueue.shift();
		}
		storedStatus = "0";
		storedMetadata = null;
	}

	let responseStatus = storedStatus;
	let responseMetadata = storedMetadata;
	let rejectMessage: string | null = null;

	// Pending dashboard commands always win over search/sync for this response
	if (hasTerminalPendingCommand(storedStatus)) {
		responseStatus = storedStatus;
		responseMetadata = storedMetadata;
	} else {
		if (searchedId !== null) {
			const attendance = await recordAttendanceScan(
				db,
				auth.terminal.id,
				searchedId,
				Date.now(),
			);
			if (attendance.ok) {
				const presentation = await resolveUserPresentation(searchedId);
				responseStatus = "7";
				responseMetadata = `${presentation.name};${presentation.photoHex}`;
				storedStatus = responseStatus;
				storedMetadata = responseMetadata;
			} else {
				// No point open: reject the scan. Terminal stays idle.
				rejectMessage = attendance.message;
			}
		} else if (syncQueue.length > 0) {
			while (syncQueue.length > 0) {
				const nextFid = syncQueue[0];
				const [userToSync] = await db
					.select()
					.from(deviceUsers)
					.where(eq(deviceUsers.id, nextFid));
				if (userToSync?.fingerprint) {
					responseStatus = "3";
					responseMetadata = `${nextFid};${userToSync.fingerprint}`;
					storedStatus = responseStatus;
					storedMetadata = responseMetadata;
					break;
				}
				syncQueue.shift();
			}
		}

		if (isTerminalIdle(storedStatus)) {
			storedStatus = "0";
		}
	}

	// Persist metadata, status, and syncQueue changes
	await db
		.update(terminals)
		.set({
			status: storedStatus,
			metadata: storedMetadata,
			syncQueue: syncQueue.length > 0 ? JSON.stringify(syncQueue) : null,
		})
		.where(eq(terminals.id, auth.terminal.id));

	const payload =
		rejectMessage !== null
			? `ERR;${sanitizeField(rejectMessage)}`
			: formatTerminalCommand(responseStatus, responseMetadata);

	return new Response(payload, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}
