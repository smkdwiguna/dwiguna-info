/**
 * Persuratan (Tanda Tangan Elektronik / TTE) tables in Cloudflare D1.
 */
import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * One asymmetric key pair per user. The private key is stored encrypted
 * (AES-GCM with a key derived from MASTER_SECRET); only the public key and the
 * self-signed certificate are stored in the clear.
 */
export const userKeys = sqliteTable("user_keys", {
	userEmail: text("user_email").primaryKey(),
	publicKey: text("public_key").notNull(),
	encryptedPrivateKey: text("encrypted_private_key").notNull(),
	certificate: text("certificate").notNull(),
	algorithm: text("algorithm").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

/**
 * A document that has been (or is being) signed. `documentHash` is the SHA-256
 * of the latest signed PDF bytes — used by the public verifier to confirm an
 * uploaded copy is bit-identical to what we stored.
 */
export const signatureDocuments = sqliteTable("signature_documents", {
	id: text("id").primaryKey(), // UUID
	title: text("title").notNull(),
	ownerEmail: text("owner_email").notNull(),
	driveFileId: text("drive_file_id"),
	driveWebViewLink: text("drive_web_view_link"),
	driveThumbnailLink: text("drive_thumbnail_link"),
	driveOwnerEmail: text("drive_owner_email"), // whose Drive the file lives in
	documentHash: text("document_hash"), // SHA-256 hex of latest signed PDF
	isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
	// DRAFT (uploaded, no signatures yet) | PARTIAL | COMPLETED
	status: text("status").notNull().default("DRAFT"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

/**
 * A signer attached to a document. The owner is also inserted as a signer.
 * Invited signers (status INVITED) can view & sign the document WITHOUT holding
 * the `persuratan` feature permission (bypass).
 */
export const signatureSigners = sqliteTable(
	"signature_signers",
	{
		id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
		documentId: text("document_id")
			.notNull()
			.references(() => signatureDocuments.id, { onDelete: "cascade" }),
		signerEmail: text("signer_email").notNull(),
		invitedByEmail: text("invited_by_email").notNull(),
		// INVITED | SIGNED
		status: text("status").notNull().default("INVITED"),
		// Which ByteRange (incremental signature) belongs to this signer.
		signatureIndex: integer("signature_index"),
		// Raw RSA signature (base64) over the ByteRange content, verifiable with Web Crypto.
		signature: text("signature"),
		// Snapshot of the signer's public key at signing time.
		publicKey: text("public_key"),
		// QR placement chosen in the UI, as ratios (0..1) of the page size.
		qrPage: integer("qr_page"),
		qrX: real("qr_x"),
		qrY: real("qr_y"),
		qrWidth: real("qr_width"),
		qrHeight: real("qr_height"),
		signedAt: text("signed_at"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
	},
	(t) => ({
		unq: unique().on(t.documentId, t.signerEmail),
	}),
);

/** Immutable audit log / timestamp store for each signing event. */
export const documentLogs = sqliteTable("document_logs", {
	id: text("id").primaryKey(), // UUID
	documentId: text("document_id").notNull(),
	signerEmail: text("signer_email").notNull(),
	documentHash: text("document_hash").notNull(),
	gdriveFileId: text("gdrive_file_id"),
	signedAt: text("signed_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});
