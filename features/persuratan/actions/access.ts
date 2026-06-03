import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { signatureSigners } from "@/lib/db/schema";
import { getServerSession } from "@/lib/server-session";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

export const PERSURATAN_PERMISSION = "persuratan";

export interface PersuratanContext {
	email: string;
	displayName: string;
	isSuperUser: boolean;
	/** Has the `persuratan` feature permission (can upload + manage). */
	hasFeaturePermission: boolean;
	/** Is invited to at least one document (bypass — can view & sign). */
	hasInvitations: boolean;
	/** Whether the feature should appear at all for this user. */
	visible: boolean;
	/** Whether the user may upload/create new documents. */
	canUpload: boolean;
}

/**
 * Resolve the current user's Persuratan access.
 *
 * - Users with the `persuratan` permission (or the superuser) can do everything.
 * - Users WITHOUT the permission but invited to a document get a bypass: the
 *   feature becomes visible and they can view/sign documents that include them,
 *   but they cannot upload new documents.
 */
export async function getPersuratanContext(): Promise<PersuratanContext | null> {
	const session = await getServerSession();
	const email = session?.user?.email;
	if (!email) return null;

	const { permissions, isSuperUser } = await getLivePermissions();
	const hasFeaturePermission =
		isSuperUser || permissions.includes(PERSURATAN_PERMISSION);

	let hasInvitations = false;
	if (!hasFeaturePermission) {
		const db = await getDb();
		const invites = await db
			.select({ id: signatureSigners.id })
			.from(signatureSigners)
			.where(eq(signatureSigners.signerEmail, email))
			.limit(1);
		hasInvitations = invites.length > 0;
	}

	return {
		email,
		displayName: session?.user?.name || email,
		isSuperUser,
		hasFeaturePermission,
		hasInvitations,
		visible: hasFeaturePermission || hasInvitations,
		canUpload: hasFeaturePermission,
	};
}

/** Throw unless the user can access the feature at all. */
export async function requirePersuratanAccess(): Promise<PersuratanContext> {
	const ctx = await getPersuratanContext();
	if (!ctx || !ctx.visible) {
		throw new Error("FORBIDDEN");
	}
	return ctx;
}

/** Throw unless the user may upload/manage documents. */
export async function requirePersuratanUpload(): Promise<PersuratanContext> {
	const ctx = await getPersuratanContext();
	if (!ctx || !ctx.canUpload) {
		throw new Error("FORBIDDEN");
	}
	return ctx;
}

/** Whether a user is a participant (owner or signer) of a document. */
export async function isDocumentParticipant(
	documentId: string,
	email: string,
): Promise<boolean> {
	const db = await getDb();
	const rows = await db
		.select({ id: signatureSigners.id })
		.from(signatureSigners)
		.where(
			and(
				eq(signatureSigners.documentId, documentId),
				eq(signatureSigners.signerEmail, email),
			),
		)
		.limit(1);
	return rows.length > 0;
}
