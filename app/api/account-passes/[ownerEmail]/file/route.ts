import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { accountPasses } from "@/lib/db/schema";
import {
	downloadDriveFileBytes,
	getDriveFileMetadata,
} from "@/lib/google-drive";
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

	const fileId = record?.frontDriveFileId ?? record?.backDriveFileId;
	if (!fileId) {
		return NextResponse.json(
			{ error: "Pass tidak ditemukan." },
			{ status: 404 },
		);
	}

	const metadata = await getDriveFileMetadata(fileId);
	const bytes = await downloadDriveFileBytes(fileId);

	return new NextResponse(new Uint8Array(bytes), {
		headers: {
			"Content-Type": metadata.mimeType || "application/octet-stream",
			"Cache-Control": "private, no-store",
		},
	});
}
