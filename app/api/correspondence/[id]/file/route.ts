import { NextResponse } from "next/server";
import { getDocumentDetail } from "@/features/correspondence/actions/documents";
import { downloadDriveFileBytes } from "@/lib/google-drive";
import { getDb } from "@/lib/db";
import { signatureDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Stream the current PDF of a document to an authorized participant.
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		// getDocumentDetail enforces participant/superuser access (returns null
		// otherwise) and throws FORBIDDEN if the user lacks the feature entirely.
		const detail = await getDocumentDetail(id);
		if (!detail || !detail.driveFileId) {
			return NextResponse.json(
				{ error: "Dokumen tidak ditemukan." },
				{ status: 404 },
			);
		}

		const db = await getDb();
		const docs = await db
			.select({ driveOwnerEmail: signatureDocuments.driveOwnerEmail })
			.from(signatureDocuments)
			.where(eq(signatureDocuments.id, id))
			.limit(1);

		const bytes = await downloadDriveFileBytes(
			detail.driveFileId,
			docs[0]?.driveOwnerEmail ?? undefined,
		);

		return new NextResponse(new Uint8Array(bytes), {
			headers: {
				"Content-Type": "application/pdf",
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Gagal memuat berkas.";
		const status = message === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}
