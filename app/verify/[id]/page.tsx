import type { Metadata } from "next";
import { VerifyClient } from "@/features/correspondence/components/verify-client";
import { getPublicDocument } from "@/features/correspondence/actions/verify";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Verifikasi Dokumen · Dwiguna.Info",
};

export default async function VerifyByIdPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const publicDoc = await getPublicDocument(id);

	return (
		<main className="min-h-screen bg-muted/20 py-4">
			<VerifyClient documentId={id} publicDoc={publicDoc} />
		</main>
	);
}
