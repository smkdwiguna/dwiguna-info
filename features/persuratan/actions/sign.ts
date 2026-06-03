"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
	documentLogs,
	signatureDocuments,
	signatureSigners,
} from "@/lib/db/schema";
import { sha256Hex, signData, toBase64 } from "@/lib/tte/crypto";
import { generateQrPng } from "@/lib/tte/qr";
import {
	addSignaturePlaceholder,
	embedSignatureVisuals,
	signPdf,
} from "@/lib/tte/pdf-signature";
import {
	downloadDriveFileBytes,
	uploadSignedPdfToDrive,
} from "@/lib/google-drive";
import { requirePersuratanAccess } from "./access";
import { getSignerCredentials } from "./keys";
import { getVerifyUrl } from "../lib/constants";

export interface QrPlacementInput {
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Sign a document on behalf of the current user:
 * draws their QR code, embeds a PKCS#7 ByteRange signature, stores a raw
 * Web-Crypto signature + audit log in D1, and re-uploads the signed PDF.
 */
export async function signDocument(
	documentId: string,
	placement: QrPlacementInput,
): Promise<{ status: string }> {
	const ctx = await requirePersuratanAccess();
	const db = await getDb();

	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(eq(signatureDocuments.id, documentId))
		.limit(1);
	if (docs.length === 0) throw new Error("Dokumen tidak ditemukan.");
	const doc = docs[0];
	if (!doc.driveFileId) throw new Error("Berkas dokumen tidak tersedia.");

	const signerRows = await db
		.select()
		.from(signatureSigners)
		.where(eq(signatureSigners.documentId, documentId));
	const mySigner = signerRows.find((s) => s.signerEmail === ctx.email);
	if (!mySigner && !ctx.isSuperUser) throw new Error("FORBIDDEN");
	if (mySigner?.status === "SIGNED") {
		throw new Error("Anda sudah menandatangani dokumen ini.");
	}

	const creds = await getSignerCredentials(ctx.email, ctx.displayName);

	// Fetch the current version of the PDF from Drive.
	const currentPdf = await downloadDriveFileBytes(
		doc.driveFileId,
		doc.driveOwnerEmail ?? undefined,
	);

	// 1. Draw the signer's QR code at the chosen position/size.
	const qrPng = await generateQrPng(getVerifyUrl(documentId));
	const signedDate = new Date();
	const label = `${ctx.displayName}\n${signedDate.toLocaleString("id-ID")}`;
	const withQr = await embedSignatureVisuals(currentPdf, [
		{
			page: placement.page,
			x: placement.x,
			y: placement.y,
			width: placement.width,
			height: placement.height,
			qrPng,
			label,
		},
	]);

	// 2 + 3. Add PAdES placeholder and fill it with a PKCS#7 signature.
	const withPlaceholder = addSignaturePlaceholder(withQr, {
		reason: `Ditandatangani oleh ${ctx.displayName}`,
		signerName: ctx.displayName,
		contactInfo: ctx.email,
	});
	const { signedPdf, signedContent } = await signPdf(
		withPlaceholder,
		creds.certificatePem,
		creds.privateKeyPem,
		signedDate,
	);

	// Raw Web-Crypto signature over the exact ByteRange bytes for D1 verification.
	const rawSignature = await signData(creds.privateKeyPem, signedContent);
	const documentHash = await sha256Hex(signedPdf);

	// Re-upload the signed PDF (kept in the document owner's Drive).
	const uploaded = await uploadSignedPdfToDrive(
		doc.ownerEmail,
		`${doc.title} (TTE).pdf`,
		signedPdf,
		{ makePublic: doc.isPublic },
	);

	const signedCountBefore = signerRows.filter(
		(s) => s.status === "SIGNED",
	).length;
	const signatureIndex = signedCountBefore;
	const nowIso = signedDate.toISOString();

	await db
		.update(signatureSigners)
		.set({
			status: "SIGNED",
			signature: toBase64(rawSignature),
			publicKey: creds.publicKeyPem,
			signatureIndex,
			qrPage: placement.page,
			qrX: placement.x,
			qrY: placement.y,
			qrWidth: placement.width,
			qrHeight: placement.height,
			signedAt: nowIso,
		})
		.where(
			and(
				eq(signatureSigners.documentId, documentId),
				eq(signatureSigners.signerEmail, ctx.email),
			),
		);

	const allSigned = signerRows.every((s) =>
		s.signerEmail === ctx.email ? true : s.status === "SIGNED",
	);
	const newStatus = allSigned ? "COMPLETED" : "PARTIAL";

	await db
		.update(signatureDocuments)
		.set({
			driveFileId: uploaded.id,
			driveWebViewLink: uploaded.webViewLink,
			driveThumbnailLink: uploaded.thumbnailLink,
			driveOwnerEmail: uploaded.ownerEmail,
			documentHash,
			status: newStatus,
			updatedAt: nowIso,
		})
		.where(eq(signatureDocuments.id, documentId));

	await db.insert(documentLogs).values({
		id: crypto.randomUUID(),
		documentId,
		signerEmail: ctx.email,
		documentHash,
		gdriveFileId: uploaded.id,
		signedAt: nowIso,
	});

	revalidatePath(`/persuratan/${documentId}`);
	revalidatePath("/persuratan");

	return { status: newStatus };
}
