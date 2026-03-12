import crypto from "crypto";

const AES_ALGORITHM = "aes-256-gcm";
const aes_key = crypto
	.createHash("sha256")
	.update(process.env.SSO_PRIVATE_KEY!)
	.digest();

type SerializablePayload = Record<string, unknown>;

export function encryptCookiePayload(payload: SerializablePayload): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(AES_ALGORITHM, aes_key, iv);
	const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptCookiePayload<T = SerializablePayload>(
	token: string,
): T {
	const [ivB64, tagB64, encryptedB64] = token.split(".");
	if (!ivB64 || !tagB64 || !encryptedB64) {
		throw new Error("Format cookie terenkripsi tidak valid");
	}

	const iv = Buffer.from(ivB64, "base64url");
	const authTag = Buffer.from(tagB64, "base64url");
	const encrypted = Buffer.from(encryptedB64, "base64url");
	const decipher = crypto.createDecipheriv(AES_ALGORITHM, aes_key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([
		decipher.update(encrypted),
		decipher.final(),
	]).toString("utf8");

	return JSON.parse(decrypted) as T;
}
