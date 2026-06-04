import { NextResponse } from "next/server";
import { getPublicDocument } from "@/features/correspondence/actions/verify";
import { downloadDriveFileBytes } from "@/lib/google-drive";
import { getDb } from "@/lib/db";
import { signatureDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Public PDF stream for documents whose owner marked them public. Used by the
// /verify/[id] page to render the document inline and to offer a download.
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const pub = await getPublicDocument(id);
		if (!pub.isPublic) {
			return NextResponse.json(
				{ error: "Dokumen tidak tersedia untuk publik." },
				{ status: 404 },
			);
		}

		const db = await getDb();
		const docs = await db
			.select({
				driveFileId: signatureDocuments.driveFileId,
				driveOwnerEmail: signatureDocuments.driveOwnerEmail,
			})
			.from(signatureDocuments)
			.where(eq(signatureDocuments.id, id))
			.limit(1);

		if (docs.length === 0 || !docs[0].driveFileId) {
			return NextResponse.json(
				{ error: "Dokumen tidak ditemukan." },
				{ status: 404 },
			);
		}

		const bytes = await downloadDriveFileBytes(
			docs[0].driveFileId,
			docs[0].driveOwnerEmail ?? undefined,
		);

		return new NextResponse(new Uint8Array(bytes), {
			headers: {
				"Content-Type": "application/pdf",
				"Cache-Control": "public, max-age=300",
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Gagal memuat berkas.";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
