import { NextResponse } from "next/server";
import { signDocument } from "@/features/persuratan/actions/sign";

// Sign a document. Access control + crypto live in the server action; this
// endpoint is a thin JSON wrapper around it.
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			documentId?: string;
			placement?: {
				page: number;
				x: number;
				y: number;
				width: number;
				height: number;
			};
		};

		if (!body.documentId || !body.placement) {
			return NextResponse.json(
				{ error: "documentId dan placement wajib diisi." },
				{ status: 400 },
			);
		}

		const result = await signDocument(body.documentId, body.placement);
		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Gagal menandatangani dokumen.";
		const status = message === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}
