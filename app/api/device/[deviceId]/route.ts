import { getDb } from "@/lib/db";
import { deviceUsers, terminals } from "@/lib/db/schema";
import { getAdminService } from "@/lib/google-api";
import { verifyDeviceRequest } from "@/lib/device-auth";
import { eq } from "drizzle-orm";

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
	let photoHex = "";

	try {
		const adminService = getAdminService();
		const userResponse = await adminService.users.get({
			userKey: deviceUser.email,
			projection: "basic",
		});
		name = userResponse.data.name?.fullName || deviceUser.email;

		const photoResponse = await adminService.users.photos.get({
			userKey: deviceUser.email,
		});
		if (photoResponse.data.photoData) {
			photoHex = Buffer.from(photoResponse.data.photoData, "base64").toString(
				"hex",
			);
		}
	} catch (error) {
		console.error("[device-route] failed to resolve user data", error);
	}

	return { name: sanitizeField(name), photoHex };
}

function parseSyncQueue(raw?: string | null): number[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) return parsed;
	} catch (e) {}
	return [];
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ deviceId: string }> },
) {
	const resolvedParams = await params;
	const auth = await verifyDeviceRequest(request, resolvedParams.deviceId);
	if (!auth.ok || !auth.terminal) {
		return new Response(`ERR;${sanitizeField(auth.message || "Unauthorized")}`, {
			status: auth.status || 401,
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
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
	let currentStatus = auth.terminal.status || "0";
	let currentMetadata = auth.terminal.metadata || null;
	let syncQueue = parseSyncQueue(auth.terminal.syncQueue);

	// Update lastSeenAt in timeout column
	await db
		.update(terminals)
		.set({ timeout: now })
		.where(eq(terminals.id, auth.terminal.id));

	// Handle ACK: clear the current command
	if (hasAck && currentStatus !== "0") {
		// Check if the current command was part of a sync
		if (currentStatus === "3" && syncQueue.length > 0) {
			syncQueue.shift();
		}
		currentStatus = "0";
		currentMetadata = null;
	}

	// Handle enrolled template from device
	if (enrolledTemplate) {
		await db
			.update(deviceUsers)
			.set({ fingerprint: enrolledTemplate.templateHex })
			.where(eq(deviceUsers.id, enrolledTemplate.fid));
	}

	// Handle user search from device (code 8 → respond with code 7)
	if (searchedId !== null) {
		const presentation = await resolveUserPresentation(searchedId);
		currentStatus = "7";
		currentMetadata = `${presentation.name};${presentation.photoHex}`;
	}

	// Process syncQueue: if no current command and queue has items, pop next
	if ((currentStatus === "0" || currentStatus === "INHERIT") && syncQueue.length > 0) {
		while (syncQueue.length > 0) {
			const nextFid = syncQueue[0];
			const [userToSync] = await db
				.select()
				.from(deviceUsers)
				.where(eq(deviceUsers.id, nextFid));
			if (userToSync && userToSync.fingerprint) {
				// Set a copy command (code 3)
				currentStatus = "3";
				currentMetadata = `${nextFid};${userToSync.fingerprint}`;
				break;
			} else {
				// No fingerprint data, skip this user
				syncQueue.shift();
			}
		}
	}

	// Ensure status is initialized nicely if it was INHERIT
	if (currentStatus === "INHERIT") {
		currentStatus = "0";
	}

	// Persist metadata, status, and syncQueue changes
	await db
		.update(terminals)
		.set({
			status: currentStatus,
			metadata: currentMetadata,
			syncQueue: syncQueue.length > 0 ? JSON.stringify(syncQueue) : null,
		})
		.where(eq(terminals.id, auth.terminal.id));

	// Format payload
	let payload = "0;";
	if (currentStatus !== "0") {
		payload = currentMetadata ? `${currentStatus};${currentMetadata}` : `${currentStatus};`;
	}

	return new Response(payload, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}
