import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userKeys } from "@/lib/db/schema";
import {
	TTE_KEY_ALGORITHM,
	encryptPrivateKey,
	decryptPrivateKey,
	generateSigningKeyPair,
} from "@/lib/tte/crypto";
import { createSelfSignedCertificate } from "@/lib/tte/pkcs7";

function getMasterSecret(): string {
	const secret = process.env.MASTER_SECRET;
	if (!secret) {
		throw new Error(
			"MASTER_SECRET belum dikonfigurasi. Tambahkan sebagai secret Cloudflare untuk mengaktifkan tanda tangan.",
		);
	}
	return secret;
}

export interface SignerCredentials {
	publicKeyPem: string;
	privateKeyPem: string;
	certificatePem: string;
}

/**
 * Ensure the user has a key pair + self-signed certificate stored in D1,
 * generating one on first use. Private keys are encrypted at rest.
 */
export async function ensureUserKeys(
	email: string,
	displayName: string,
): Promise<{ publicKeyPem: string; certificatePem: string }> {
	const db = await getDb();
	const existing = await db
		.select()
		.from(userKeys)
		.where(eq(userKeys.userEmail, email))
		.limit(1);

	if (existing.length > 0) {
		return {
			publicKeyPem: existing[0].publicKey,
			certificatePem: existing[0].certificate,
		};
	}

	const { publicKeyPem, privateKeyPem } = await generateSigningKeyPair();
	const certificatePem = createSelfSignedCertificate({
		publicKeyPem,
		privateKeyPem,
		commonName: displayName || email,
		email,
	});
	const encryptedPrivateKey = await encryptPrivateKey(
		privateKeyPem,
		getMasterSecret(),
	);

	await db.insert(userKeys).values({
		userEmail: email,
		publicKey: publicKeyPem,
		encryptedPrivateKey,
		certificate: certificatePem,
		algorithm: TTE_KEY_ALGORITHM,
	});

	return { publicKeyPem, certificatePem };
}

/** Retrieve and decrypt the signer's credentials for an in-memory signing op. */
export async function getSignerCredentials(
	email: string,
	displayName: string,
): Promise<SignerCredentials> {
	await ensureUserKeys(email, displayName);

	const db = await getDb();
	const rows = await db
		.select()
		.from(userKeys)
		.where(eq(userKeys.userEmail, email))
		.limit(1);

	if (rows.length === 0) {
		throw new Error("Kunci penandatangan tidak ditemukan.");
	}

	const row = rows[0];
	const privateKeyPem = await decryptPrivateKey(
		row.encryptedPrivateKey,
		getMasterSecret(),
	);

	return {
		publicKeyPem: row.publicKey,
		privateKeyPem,
		certificatePem: row.certificate,
	};
}

/** Look up the stored public key for an email (used by the verifier). */
export async function getStoredPublicKey(
	email: string,
): Promise<string | null> {
	const db = await getDb();
	const rows = await db
		.select({ publicKey: userKeys.publicKey })
		.from(userKeys)
		.where(eq(userKeys.userEmail, email))
		.limit(1);
	return rows[0]?.publicKey ?? null;
}
