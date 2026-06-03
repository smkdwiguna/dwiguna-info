"use server";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
	signatureDocuments,
	signatureSigners,
} from "@/lib/db/schema";
import { isWorkspaceEmail } from "@/lib/access";
import { sha256Hex } from "@/lib/tte/crypto";
import { uploadSignedPdfToDrive, setDriveFilePublic } from "@/lib/google-drive";
import {
	getPersuratanContext,
	requirePersuratanAccess,
	requirePersuratanUpload,
} from "./access";
import { ensureUserKeys } from "./keys";

export interface SignerView {
	email: string;
	status: string;
	signedAt: string | null;
	qr: { page: number; x: number; y: number; width: number; height: number } | null;
}

export interface DocumentSummary {
	id: string;
	title: string;
	ownerEmail: string;
	status: string;
	isPublic: boolean;
	createdAt: string;
	signerCount: number;
	signedCount: number;
	isOwner: boolean;
}

export interface DocumentDetail extends DocumentSummary {
	driveFileId: string | null;
	driveWebViewLink: string | null;
	documentHash: string | null;
	signers: SignerView[];
	canSign: boolean;
	canManage: boolean;
	mySignerStatus: string | null;
}

function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

/** Create a document from an uploaded PDF and invite the given signers. */
export async function createDocument(formData: FormData): Promise<string> {
	const ctx = await requirePersuratanUpload();
	const title = String(formData.get("title") || "").trim();
	const isPublic = String(formData.get("isPublic") || "false") === "true";
	const file = formData.get("file");
	const signersRaw = String(formData.get("signers") || "[]");

	if (!title) throw new Error("Judul dokumen wajib diisi.");
	if (!(file instanceof File)) throw new Error("Berkas PDF wajib diunggah.");
	if (file.type && file.type !== "application/pdf") {
		throw new Error("Berkas harus berformat PDF.");
	}

	let invitedEmails: string[] = [];
	try {
		const parsed = JSON.parse(signersRaw);
		if (Array.isArray(parsed)) {
			invitedEmails = parsed.map((e) => normalizeEmail(String(e)));
		}
	} catch {
		invitedEmails = [];
	}
	invitedEmails = Array.from(
		new Set(invitedEmails.filter((e) => e && isWorkspaceEmail(e))),
	);

	await ensureUserKeys(ctx.email, ctx.displayName);

	const pdfBytes = new Uint8Array(await file.arrayBuffer());
	const documentHash = await sha256Hex(pdfBytes);

	const uploaded = await uploadSignedPdfToDrive(
		ctx.email,
		`${title}.pdf`,
		pdfBytes,
		{ makePublic: isPublic },
	);

	const documentId = crypto.randomUUID();
	const db = await getDb();

	await db.insert(signatureDocuments).values({
		id: documentId,
		title,
		ownerEmail: ctx.email,
		driveFileId: uploaded.id,
		driveWebViewLink: uploaded.webViewLink,
		driveThumbnailLink: uploaded.thumbnailLink,
		driveOwnerEmail: uploaded.ownerEmail,
		documentHash,
		isPublic,
		status: "DRAFT",
	});

	// Owner is a signer too; invited signers get the bypass.
	const signerRows = [
		{
			documentId,
			signerEmail: ctx.email,
			invitedByEmail: ctx.email,
			status: "INVITED",
		},
		...invitedEmails
			.filter((email) => email !== ctx.email)
			.map((email) => ({
				documentId,
				signerEmail: email,
				invitedByEmail: ctx.email,
				status: "INVITED",
			})),
	];
	await db.insert(signatureSigners).values(signerRows);

	return documentId;
}

/** List documents the user owns or is invited to. */
export async function listDocuments(): Promise<DocumentSummary[]> {
	const ctx = await requirePersuratanAccess();
	const db = await getDb();

	const participantDocIds = await db
		.select({ documentId: signatureSigners.documentId })
		.from(signatureSigners)
		.where(eq(signatureSigners.signerEmail, ctx.email));
	const ids = participantDocIds.map((r) => r.documentId);

	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(
			ids.length > 0
				? or(
						eq(signatureDocuments.ownerEmail, ctx.email),
						inArray(signatureDocuments.id, ids),
					)
				: eq(signatureDocuments.ownerEmail, ctx.email),
		)
		.orderBy(desc(signatureDocuments.createdAt));

	const summaries: DocumentSummary[] = [];
	for (const doc of docs) {
		const signers = await db
			.select({ status: signatureSigners.status })
			.from(signatureSigners)
			.where(eq(signatureSigners.documentId, doc.id));
		summaries.push({
			id: doc.id,
			title: doc.title,
			ownerEmail: doc.ownerEmail,
			status: doc.status,
			isPublic: doc.isPublic,
			createdAt: doc.createdAt,
			signerCount: signers.length,
			signedCount: signers.filter((s) => s.status === "SIGNED").length,
			isOwner: doc.ownerEmail === ctx.email,
		});
	}
	return summaries;
}

/** Get full document detail for a participant. */
export async function getDocumentDetail(
	documentId: string,
): Promise<DocumentDetail | null> {
	const ctx = await requirePersuratanAccess();
	const db = await getDb();

	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(eq(signatureDocuments.id, documentId))
		.limit(1);
	if (docs.length === 0) return null;
	const doc = docs[0];

	const signers = await db
		.select()
		.from(signatureSigners)
		.where(eq(signatureSigners.documentId, documentId));

	const isOwner = doc.ownerEmail === ctx.email;
	const mySigner = signers.find((s) => s.signerEmail === ctx.email);
	const isParticipant = isOwner || !!mySigner;
	if (!isParticipant && !ctx.isSuperUser) return null;

	return {
		id: doc.id,
		title: doc.title,
		ownerEmail: doc.ownerEmail,
		status: doc.status,
		isPublic: doc.isPublic,
		createdAt: doc.createdAt,
		driveFileId: doc.driveFileId,
		driveWebViewLink: doc.driveWebViewLink,
		documentHash: doc.documentHash,
		signerCount: signers.length,
		signedCount: signers.filter((s) => s.status === "SIGNED").length,
		isOwner,
		canManage: isOwner || ctx.isSuperUser,
		canSign: !!mySigner && mySigner.status !== "SIGNED",
		mySignerStatus: mySigner?.status ?? null,
		signers: signers.map((s) => ({
			email: s.signerEmail,
			status: s.status,
			signedAt: s.signedAt,
			qr:
				s.qrPage != null && s.qrX != null
					? {
							page: s.qrPage,
							x: s.qrX,
							y: s.qrY ?? 0,
							width: s.qrWidth ?? 0,
							height: s.qrHeight ?? 0,
						}
					: null,
		})),
	};
}

/** Owner invites an additional signer (bypass-eligible). */
export async function inviteSigner(
	documentId: string,
	email: string,
): Promise<void> {
	const ctx = await requirePersuratanAccess();
	const normalized = normalizeEmail(email);
	if (!isWorkspaceEmail(normalized)) {
		throw new Error("Hanya email smkdwiguna.sch.id yang bisa diundang.");
	}

	const db = await getDb();
	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(eq(signatureDocuments.id, documentId))
		.limit(1);
	if (docs.length === 0) throw new Error("Dokumen tidak ditemukan.");
	if (docs[0].ownerEmail !== ctx.email && !ctx.isSuperUser) {
		throw new Error("FORBIDDEN");
	}

	const existing = await db
		.select({ id: signatureSigners.id })
		.from(signatureSigners)
		.where(
			and(
				eq(signatureSigners.documentId, documentId),
				eq(signatureSigners.signerEmail, normalized),
			),
		)
		.limit(1);
	if (existing.length > 0) return;

	await db.insert(signatureSigners).values({
		documentId,
		signerEmail: normalized,
		invitedByEmail: ctx.email,
		status: "INVITED",
	});
}

/** Toggle whether the document is publicly viewable. */
export async function setDocumentPublic(
	documentId: string,
	isPublic: boolean,
): Promise<void> {
	const ctx = await requirePersuratanAccess();
	const db = await getDb();
	const docs = await db
		.select()
		.from(signatureDocuments)
		.where(eq(signatureDocuments.id, documentId))
		.limit(1);
	if (docs.length === 0) throw new Error("Dokumen tidak ditemukan.");
	const doc = docs[0];
	if (doc.ownerEmail !== ctx.email && !ctx.isSuperUser) {
		throw new Error("FORBIDDEN");
	}

	if (doc.driveFileId) {
		await setDriveFilePublic(
			doc.driveFileId,
			isPublic,
			doc.driveOwnerEmail ?? undefined,
		);
	}
	await db
		.update(signatureDocuments)
		.set({ isPublic, updatedAt: new Date().toISOString() })
		.where(eq(signatureDocuments.id, documentId));
}

/** Whether the feature should be shown in the sidebar for the current user. */
export async function isPersuratanVisible(): Promise<boolean> {
	const ctx = await getPersuratanContext();
	return !!ctx?.visible;
}
