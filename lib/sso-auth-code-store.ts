import crypto from "crypto";

type StoredSession = Record<string, unknown>;

type AuthCodeRecord = {
	session: StoredSession;
	audience: string;
	subject?: string;
	expiresAt: number;
};

const AES_ALGORITHM = "aes-256-gcm";
const AUTH_CODE_TTL_MS = 60_000;

function getEncryptionKey(): Buffer {
	return crypto
		.createHash("sha256")
		.update(process.env.SSO_PRIVATE_KEY!)
		.digest();
}

export function createAuthorizationCode(input: {
	session: StoredSession;
	audience: string;
	subject?: string;
}): string {
	const now = Date.now();
	const expiresAt = now + AUTH_CODE_TTL_MS;

	const record: AuthCodeRecord = {
		session: input.session,
		audience: input.audience,
		subject: input.subject,
		expiresAt,
	};

	const key = getEncryptionKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
	const plaintext = Buffer.from(JSON.stringify(record), "utf8");
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function consumeAuthorizationCode(input: {
	code: string;
	audience: string;
	subject?: string;
}): StoredSession {
	const now = Date.now();

	const [ivB64, tagB64, encryptedB64] = input.code.split(".");
	if (!ivB64 || !tagB64 || !encryptedB64) {
		throw new Error("Format authorization code tidak valid");
	}

	let record: AuthCodeRecord;
	try {
		const key = getEncryptionKey();
		const iv = Buffer.from(ivB64, "base64url");
		const authTag = Buffer.from(tagB64, "base64url");
		const encrypted = Buffer.from(encryptedB64, "base64url");
		const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([
			decipher.update(encrypted),
			decipher.final(),
		]).toString("utf8");

		record = JSON.parse(decrypted) as AuthCodeRecord;
	} catch (error) {
		console.error("Auth code decryption failed:", error);
		throw new Error("Authorization code tidak valid atau rusak");
	}

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
