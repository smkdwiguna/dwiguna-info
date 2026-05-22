import { getDb } from "@/lib/db";
import { terminals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SIGNATURE_ALGORITHM = "HMAC-SHA256";
const MAX_TIME_SKEW_SECONDS = 5 * 60;
const NONCE_TTL_SECONDS = 5 * 60;

type TerminalMetadata = {
	recentNonces?: Record<string, number>;
	lastSeenAt?: number;
};

function parseMetadata(raw?: string | null): TerminalMetadata {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as TerminalMetadata;
	} catch (error) {
		console.error("[device-auth] failed to parse terminal metadata", error);
		return {};
	}
}

function toHex(buffer: ArrayBuffer) {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function hmacSha256Hex(secret: string, payload: string) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload),
	);
	return toHex(signature);
}

function isSignatureValid(expected: string, actual: string) {
	if (expected.length !== actual.length) return false;
	let mismatch = 0;
	for (let i = 0; i < expected.length; i += 1) {
		mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
	}
	return mismatch === 0;
}

export async function verifyDeviceRequest(
	request: Request,
	deviceId: string,
) {
	const timestampHeader = request.headers.get("x-timestamp");
	const nonce = request.headers.get("x-nonce");
	const signature = request.headers.get("x-signature");

	if (!deviceId) {
		return { ok: false, status: 401, message: "Missing device id." };
	}

	if (!timestampHeader || !nonce || !signature) {
		return { ok: false, status: 401, message: "Missing auth headers." };
	}

	const timestamp = Number(timestampHeader);
	if (!Number.isFinite(timestamp)) {
		return { ok: false, status: 401, message: "Invalid timestamp." };
	}

	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - timestamp) > MAX_TIME_SKEW_SECONDS) {
		return { ok: false, status: 401, message: "Timestamp out of range." };
	}

	const db = await getDb();
	const [terminal] = await db
		.select()
		.from(terminals)
		.where(eq(terminals.id, deviceId));

	if (!terminal || !terminal.password) {
		return { ok: false, status: 401, message: "Device not registered." };
	}

	const bodyText = request.method === "GET" ? "" : await request.text();
	const url = new URL(request.url);
	const signaturePayload = [
		request.method.toUpperCase(),
		url.pathname,
		timestampHeader,
		nonce,
		bodyText,
	].join("\n");

	const expectedSignature = await hmacSha256Hex(
		terminal.password,
		signaturePayload,
	);

	if (!isSignatureValid(expectedSignature, signature)) {
		return { ok: false, status: 401, message: "Signature mismatch." };
	}

	const metadata = parseMetadata(terminal.metadata);
	const recentNonces = metadata.recentNonces ?? {};
	for (const [value, seenAt] of Object.entries(recentNonces)) {
		if (now - seenAt > NONCE_TTL_SECONDS) {
			delete recentNonces[value];
		}
	}

	if (recentNonces[nonce]) {
		return { ok: false, status: 401, message: "Nonce already used." };
	}

	recentNonces[nonce] = now;
	metadata.recentNonces = recentNonces;
	metadata.lastSeenAt = now;

	await db
		.update(terminals)
		.set({ metadata: JSON.stringify(metadata) })
		.where(eq(terminals.id, deviceId));

	return { ok: true, terminal, bodyText };
}

export const deviceAuthConfig = {
	signatureAlgorithm: SIGNATURE_ALGORITHM,
	maxTimeSkewSeconds: MAX_TIME_SKEW_SECONDS,
	nonceTtlSeconds: NONCE_TTL_SECONDS,
};
