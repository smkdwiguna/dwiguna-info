import { getDb } from "@/lib/db";
import { deviceUsers, terminals } from "@/lib/db/schema";
import { getAdminService } from "@/lib/google-api";
import { verifyDeviceRequest } from "@/lib/device-auth";
import { eq } from "drizzle-orm";

type PendingCommand = {
	id: string;
	code: number;
	fid?: number;
	templateHex?: string;
	name?: string;
	photoHex?: string;
};

type TerminalMetadata = {
	pendingCommand?: PendingCommand;
	pendingCommandAt?: number;
	recentNonces?: Record<string, number>;
	lastSeenAt?: number;
};

const LINE_BREAK_REGEX = /\r?\n/;

function parseMetadata(raw?: string | null): TerminalMetadata {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as TerminalMetadata;
	} catch (error) {
		console.error("[device-route] failed to parse terminal metadata", error);
		return {};
	}
}

function sanitizeField(value?: string) {
	if (!value) return "";
	return value.replace(/[;\r\n]/g, " ").trim();
}

function formatCommandPayload(command: PendingCommand) {
	const fid = command.fid !== undefined ? String(command.fid) : "";

	switch (command.code) {
		case 0:
			return "0;";
		case 1:
			return "1;";
		case 2:
			return `2;${fid}`;
		case 3:
			return `3;${fid};${command.templateHex ?? ""}`;
		case 4:
			return `4;${fid}`;
		case 5:
			return `5;${fid}`;
		case 6:
			return "6";
		case 7:
			return `7;${sanitizeField(command.name)};${command.photoHex ?? ""}`;
		default:
			return "0;";
	}
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

export async function POST(
	request: Request,
	{ params }: { params: { deviceId: string } },
) {
	const auth = await verifyDeviceRequest(request, params.deviceId);
	if (!auth.ok) {
		return new Response(`ERR;${sanitizeField(auth.message)}`, {
			status: auth.status,
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	}

	const bodyText = auth.bodyText || "";
	const lines = bodyText
		.split(LINE_BREAK_REGEX)
		.map((line) => line.trim())
		.filter(Boolean);

	const db = await getDb();
	let ackId: string | null = null;
	let searchedId: number | null = null;
	let enrolledTemplate: { fid: number; templateHex: string } | null = null;

	for (const line of lines) {
		const [type, ...parts] = line.split(";");
		if (!type) continue;

		if (type === "A") {
			ackId = sanitizeField(parts[0]);
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

	if (ackId) {
		const metadata = parseMetadata(auth.terminal.metadata);
		if (metadata.pendingCommand?.id === ackId) {
			delete metadata.pendingCommand;
			delete metadata.pendingCommandAt;
			await db
				.update(terminals)
				.set({ metadata: JSON.stringify(metadata) })
				.where(eq(terminals.id, auth.terminal.id));
		}
	} else if (lines.some((line) => line === "A" || line === "A;")) {
		const metadata = parseMetadata(auth.terminal.metadata);
		if (metadata.pendingCommand) {
			delete metadata.pendingCommand;
			delete metadata.pendingCommandAt;
			await db
				.update(terminals)
				.set({ metadata: JSON.stringify(metadata) })
				.where(eq(terminals.id, auth.terminal.id));
		}
	}

	if (enrolledTemplate) {
		await db
			.update(deviceUsers)
			.set({ fingerprint: enrolledTemplate.templateHex })
			.where(eq(deviceUsers.id, enrolledTemplate.fid));
	}

	if (searchedId !== null) {
		const metadata = parseMetadata(auth.terminal.metadata);
		const presentation = await resolveUserPresentation(searchedId);
		metadata.pendingCommand = {
			id: `cmd-${Date.now()}`,
			code: 7,
			fid: searchedId,
			name: presentation.name,
			photoHex: presentation.photoHex,
		};
		metadata.pendingCommandAt = Math.floor(Date.now() / 1000);
		await db
			.update(terminals)
			.set({ metadata: JSON.stringify(metadata) })
			.where(eq(terminals.id, auth.terminal.id));
	}

	// Read the latest terminal metadata and return the current pending command in the POST response
	const [updatedTerminal] = await db
		.select()
		.from(terminals)
		.where(eq(terminals.id, auth.terminal.id));
	const updatedMetadata = parseMetadata(updatedTerminal?.metadata);
	const command = updatedMetadata.pendingCommand ?? null;
	const payload = command ? formatCommandPayload(command) : "0;";

	return new Response(payload, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
	}
