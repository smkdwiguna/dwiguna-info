import type { Metadata } from "next";
import { VerifyClient } from "@/features/correspondence/components/verify-client";

export const metadata: Metadata = {
	title: "Verifikasi Dokumen · Dwiguna.Info",
};

export default function VerifyPage() {
	return (
		<main className="min-h-screen bg-muted/20 py-8">
			<VerifyClient />
		</main>
	);
}
