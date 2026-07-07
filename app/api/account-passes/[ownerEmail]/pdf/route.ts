import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { PDFDocument, rgb } from "pdf-lib";
import { getDb } from "@/lib/db";
import { accountPasses } from "@/lib/db/schema";
import {
	downloadDriveFileBytes,
	getDriveFileMetadata,
} from "@/lib/google-drive";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

async function addImagePage(
	pdf: PDFDocument,
	imageBytes: Uint8Array,
	mimeType: string,
) {
	let image;
	if (mimeType === "image/png") {
		image = await pdf.embedPng(imageBytes);
	} else if (mimeType === "image/jpeg") {
		image = await pdf.embedJpg(imageBytes);
	} else {
		throw new Error(`Tipe berkas tidak didukung: ${mimeType}`);
	}

	const { width, height } = image.scale(1);
	const page = pdf.addPage([width, height]);
	page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
	page.drawImage(image, { x: 0, y: 0, width, height });
}

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

	if (!record || (!record.frontDriveFileId && !record.backDriveFileId)) {
		return NextResponse.json(
			{ error: "Pass tidak ditemukan." },
			{ status: 404 },
		);
	}

	const pdf = await PDFDocument.create();
	const files = [record.frontDriveFileId, record.backDriveFileId].filter(
		(fileId): fileId is string => !!fileId,
	);

	for (const fileId of files) {
		const metadata = await getDriveFileMetadata(fileId);
		const mimeType = metadata.mimeType || "";
		if (mimeType !== "image/png" && mimeType !== "image/jpeg") {
			return NextResponse.json(
				{ error: `Tipe berkas tidak didukung: ${mimeType || "unknown"}` },
				{ status: 415 },
			);
		}

		const bytes = await downloadDriveFileBytes(fileId);
		await addImagePage(pdf, bytes, mimeType);
	}

	const pdfBytes = await pdf.save();
	return new NextResponse(pdfBytes, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="kartu-${ownerEmail.split("@")[0]}.pdf"`,
			"Cache-Control": "private, no-store",
		},
	});
}
