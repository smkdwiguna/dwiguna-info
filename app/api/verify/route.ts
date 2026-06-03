import { NextResponse } from "next/server";
import { verifyUploadedPdf } from "@/features/persuratan/actions/verify";

// Public verification endpoint: accepts a multipart PDF upload (and optional
// documentId) and returns the verification result. No authentication required.
export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const result = await verifyUploadedPdf(formData);
		return NextResponse.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Gagal memverifikasi dokumen.";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
