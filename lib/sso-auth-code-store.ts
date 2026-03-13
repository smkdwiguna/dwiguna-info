import crypto from "crypto";

type StoredSession = Record<string, unknown>;

type AuthCodeRecord = {
	session: StoredSession;
	audience: string;
	subject?: string;
	expiresAt: number;
};

const authCodeStore = new Map<string, AuthCodeRecord>();
const AUTH_CODE_TTL_MS = 60_000;
const MAX_CODES = 5_000;

function cleanupExpiredCodes(now: number) {
	for (const [code, record] of authCodeStore.entries()) {
		if (record.expiresAt <= now) {
			authCodeStore.delete(code);
		}
	}
}

function trimIfNeeded() {
	if (authCodeStore.size <= MAX_CODES) {
		return;
	}

	let removed = 0;
	for (const code of authCodeStore.keys()) {
		authCodeStore.delete(code);
		removed += 1;
		if (removed >= Math.ceil(MAX_CODES * 0.1)) {
			break;
		}
	}
}

export function createAuthorizationCode(input: {
	session: StoredSession;
	audience: string;
	subject?: string;
}): string {
	const now = Date.now();
	cleanupExpiredCodes(now);
	trimIfNeeded();

	const code = crypto.randomBytes(32).toString("base64url");
	authCodeStore.set(code, {
		session: input.session,
		audience: input.audience,
		subject: input.subject,
		expiresAt: now + AUTH_CODE_TTL_MS,
	});

	return code;
}

export function consumeAuthorizationCode(input: {
	code: string;
	audience: string;
	subject?: string;
}): StoredSession {
	const now = Date.now();
	cleanupExpiredCodes(now);

	const record = authCodeStore.get(input.code);
	if (!record) {
		throw new Error("Authorization code tidak ditemukan atau sudah digunakan");
	}

	authCodeStore.delete(input.code);

	if (record.expiresAt <= now) {
		throw new Error("Authorization code sudah kedaluwarsa");
	}

	if (record.audience !== input.audience) {
		throw new Error("Audience authorization code tidak cocok");
	}

	if ((record.subject ?? undefined) !== (input.subject ?? undefined)) {
		throw new Error("Subject authorization code tidak cocok");
	}

	return record.session;
}
