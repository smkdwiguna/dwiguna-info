import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { accountPasses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ ownerEmail: string }> },
) {
	const { ownerEmail } = await params;
	const { session, isSuperUser } = await getLivePermissions();
	if (!session?.user?.email) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (
		!isSuperUser &&
		session.user.email.toLowerCase() !== ownerEmail.toLowerCase()
	) {
		return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
	}

	const db = await getDb();
	const [record] = await db
		.select()
		.from(accountPasses)
		.where(eq(accountPasses.ownerEmail, ownerEmail))
		.limit(1);

	if (!record) {
		return NextResponse.json({ success: true, pass: null });
	}

	return NextResponse.json({
		success: true,
		pass: {
			ownerEmail: record.ownerEmail,
			hasFront: !!record.frontDriveFileId,
			hasBack: !!record.backDriveFileId,
			walletStatus: record.walletStatus,
			downloadPdfUrl: `/api/account-passes/${encodeURIComponent(ownerEmail)}/pdf`,
		},
	});
}