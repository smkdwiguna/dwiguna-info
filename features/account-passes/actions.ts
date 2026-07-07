import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { accountPasses } from "@/lib/db/schema";

export type AccountPassSide = "front" | "back";

export type AccountPassRecord = typeof accountPasses.$inferSelect;

export async function getAccountPassByEmail(ownerEmail: string) {
	const db = await getDb();
	const [record] = await db
		.select()
		.from(accountPasses)
		.where(eq(accountPasses.ownerEmail, ownerEmail))
		.limit(1);

	return record ?? null;
}

type UpsertAccountPassInput = {
	ownerEmail: string;
	side: AccountPassSide;
	driveFileId: string;
	qrPayload?: string | null;
};

export async function upsertAccountPassSide(input: UpsertAccountPassInput) {
	const db = await getDb();
	const existing = await getAccountPassByEmail(input.ownerEmail);
	const now = new Date().toISOString();

	const nextValue = {
		ownerEmail: input.ownerEmail,
		frontDriveFileId:
			input.side === "front"
				? input.driveFileId
				: (existing?.frontDriveFileId ?? null),
		backDriveFileId:
			input.side === "back"
				? input.driveFileId
				: (existing?.backDriveFileId ?? null),
		qrPayload: input.qrPayload ?? existing?.qrPayload ?? null,
		// walletStatus: existing?.walletStatus ?? "NOT_READY",
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};

	await db
		.insert(accountPasses)
		.values(nextValue)
		.onConflictDoUpdate({
			target: accountPasses.ownerEmail,
			set: {
				frontDriveFileId: nextValue.frontDriveFileId,
				backDriveFileId: nextValue.backDriveFileId,
				qrPayload: nextValue.qrPayload,
				// walletStatus: nextValue.walletStatus,
				updatedAt: nextValue.updatedAt,
			},
		});

	return getAccountPassByEmail(input.ownerEmail);
}
