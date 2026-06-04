"use server";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
	documentLogs,
	signatureDocuments,
	signatureSigners,
	userKeys,
} from "@/lib/db/schema";
import { fromBase64, sha256Hex, verifyData } from "@/lib/tte/crypto";
import { resolveUserNames } from "../lib/user-names";

export interface VerifySignerInfo {
	email: string;
	name: string | null;
	signedAt: string | null;
	trusted: boolean;
}

export interface VerificationResult {
	found: boolean;
	documentId: string | null;
	title: string | null;
	ownerEmail: string | null;
	ownerName: string | null;
	/** Hashes match — the uploaded copy is identical to the authentic file. */
	isUntampered: boolean;
	/** A signer's public key is registered in our internal key store. */
	isTrustedIdentity: boolean;
	/** An electronic timestamp exists in the audit log. */
	hasTimestamp: boolean;
	/** The embedded PKCS#7 ByteRange signature verified cryptographically. */
	isCryptographicallyValid: boolean;
	signers: VerifySignerInfo[];
	message: string;
}

async function buildResultForDocument(
	documentId: string,
	uploadedBytes: Uint8Array,
	uploadedHash: string,
): Promise<VerificationResult> {
	const db = await getDb();
	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(eq(signatureDocuments.id, documentId))
		.limit(1);

	if (docs.length === 0) {
		return emptyResult("Dokumen tidak ditemukan dalam basis data.");
	}
	const doc = docs[0];

	const signerRows = await db
		.select()
		.from(signatureSigners)
		.where(eq(signatureSigners.documentId, documentId));

	const logs = await db
		.select({ id: documentLogs.id })
		.from(documentLogs)
		.where(eq(documentLogs.documentId, documentId))
		.limit(1);

	const isUntampered = !!doc.documentHash && doc.documentHash === uploadedHash;

	const names = await resolveUserNames([
		doc.ownerEmail,
		...signerRows.map((s) => s.signerEmail),
	]);

	// Identity: at least one signer's public key matches our registered key.
	const signers: VerifySignerInfo[] = [];
	let isTrustedIdentity = false;
	for (const s of signerRows) {
		let trusted = false;
		if (s.publicKey) {
			const keyRows = await db
				.select({ publicKey: userKeys.publicKey })
				.from(userKeys)
				.where(eq(userKeys.userEmail, s.signerEmail))
				.limit(1);
			trusted = keyRows.length > 0 && keyRows[0].publicKey === s.publicKey;
		}
		if (trusted) isTrustedIdentity = true;
		signers.push({
			email: s.signerEmail,
			name: names[s.signerEmail.toLowerCase()] ?? null,
			signedAt: s.signedAt,
			trusted,
		});
	}

	// Cryptographic check: verify the last signer's raw signature over the
	// exact ByteRange content of the uploaded file.
	let isCryptographicallyValid = false;
	if (isUntampered) {
		// Loaded lazily so pdf-lib stays out of the SSR bundle of pages that
		// import this module only for lightweight metadata.
		const { extractByteRanges } = await import("@/lib/tte/pdf-signature");
		const ranges = extractByteRanges(uploadedBytes);
		const lastSigner = [...signerRows]
			.filter((s) => s.status === "SIGNED" && s.signature && s.publicKey)
			.sort((a, b) => (b.signatureIndex ?? 0) - (a.signatureIndex ?? 0))[0];
		if (lastSigner && ranges.length > 0) {
			const lastRange = ranges[ranges.length - 1];
			try {
				isCryptographicallyValid = await verifyData(
					lastSigner.publicKey!,
					fromBase64(lastSigner.signature!),
					lastRange.content,
				);
			} catch {
				isCryptographicallyValid = false;
			}
		}
	}

	const message = isUntampered
		? "Dokumen terverifikasi: salinan ini identik dengan berkas asli."
		: "Salinan ini BERBEDA dari berkas asli (kemungkinan telah dimodifikasi).";

	return {
		found: true,
		documentId,
		title: doc.title,
		ownerEmail: doc.ownerEmail,
		ownerName: names[doc.ownerEmail.toLowerCase()] ?? doc.ownerEmail,
		isUntampered,
		isTrustedIdentity,
		hasTimestamp: logs.length > 0,
		isCryptographicallyValid,
		signers,
		message,
	};
}

function emptyResult(message: string): VerificationResult {
	return {
		found: false,
		documentId: null,
		title: null,
		ownerEmail: null,
		ownerName: null,
		isUntampered: false,
		isTrustedIdentity: false,
		hasTimestamp: false,
		isCryptographicallyValid: false,
		signers: [],
		message,
	};
}

/**
 * Public verification entrypoint. Accepts an uploaded PDF and, optionally, the
 * document id (from a QR/route). With an id, it checks the copy against that
 * specific document; without one, it looks the document up by its hash.
 */
export async function verifyUploadedPdf(
	formData: FormData,
): Promise<VerificationResult> {
	const file = formData.get("file");
	const documentId = formData.get("documentId");

	if (!(file instanceof File)) {
		return emptyResult("Tidak ada berkas PDF yang diunggah.");
	}
	const bytes = new Uint8Array(await file.arrayBuffer());
	const uploadedHash = await sha256Hex(bytes);

	if (typeof documentId === "string" && documentId.length > 0) {
		return buildResultForDocument(documentId, bytes, uploadedHash);
	}

	// No id: identify the document by matching the stored hash.
	const db = await getDb();
	const matches = await db
		.select({ id: signatureDocuments.id })
		.from(signatureDocuments)
		.where(eq(signatureDocuments.documentHash, uploadedHash))
		.limit(1);

	if (matches.length > 0) {
		return buildResultForDocument(matches[0].id, bytes, uploadedHash);
	}

	// Fall back to the immutable audit log (handles superseded versions).
	const logMatch = await db
		.select({ documentId: documentLogs.documentId })
		.from(documentLogs)
		.where(eq(documentLogs.documentHash, uploadedHash))
		.orderBy(desc(documentLogs.signedAt))
		.limit(1);
	if (logMatch.length > 0) {
		return buildResultForDocument(logMatch[0].documentId, bytes, uploadedHash);
	}

	return emptyResult(
		"Tidak ada dokumen yang cocok. Berkas ini tidak dikenali atau telah dimodifikasi.",
	);
}

export interface PublicDocumentInfo {
	exists: boolean;
	isPublic: boolean;
	title: string | null;
	ownerEmail: string | null;
	ownerName: string | null;
	status: string | null;
	webViewLink: string | null;
	signers: { email: string; name: string | null; signedAt: string | null }[];
}

/** Minimal public-facing metadata for a /verify/[id] landing page. */
export async function getPublicDocument(
	documentId: string,
): Promise<PublicDocumentInfo> {
	const db = await getDb();
	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(eq(signatureDocuments.id, documentId))
		.limit(1);

	if (docs.length === 0) {
		return {
			exists: false,
			isPublic: false,
			title: null,
			ownerEmail: null,
			ownerName: null,
			status: null,
			webViewLink: null,
			signers: [],
		};
	}

	const doc = docs[0];
	if (!doc.isPublic) {
		// Document exists but is private: only allow copy-checking, no preview.
		return {
			exists: true,
			isPublic: false,
			title: null,
			ownerEmail: null,
			ownerName: null,
			status: null,
			webViewLink: null,
			signers: [],
		};
	}

	const signerRows = await db
		.select({
			email: signatureSigners.signerEmail,
			signedAt: signatureSigners.signedAt,
		})
		.from(signatureSigners)
		.where(eq(signatureSigners.documentId, documentId));

	const names = await resolveUserNames([
		doc.ownerEmail,
		...signerRows.map((s) => s.email),
	]);

	return {
		exists: true,
		isPublic: true,
		title: doc.title,
		ownerEmail: doc.ownerEmail,
		ownerName: names[doc.ownerEmail.toLowerCase()] ?? doc.ownerEmail,
		status: doc.status,
		webViewLink: doc.driveWebViewLink,
		signers: signerRows.map((s) => ({
			email: s.email,
			name: names[s.email.toLowerCase()] ?? null,
			signedAt: s.signedAt,
		})),
	};
}
