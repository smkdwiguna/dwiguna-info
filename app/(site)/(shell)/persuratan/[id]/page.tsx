import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/page-header";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import { getPersuratanContext } from "@/features/persuratan/actions/access";
import { getDocumentDetail } from "@/features/persuratan/actions/documents";
import { redirectToDashboardWithFlash } from "@/features/access-management/actions/require-permission";
import { PersuratanDetailClient } from "@/features/persuratan/components/persuratan-detail-client";

export const dynamic = "force-dynamic";

export default async function PersuratanDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const ctx = await getPersuratanContext();
	if (!ctx || !ctx.visible) {
		await redirectToDashboardWithFlash(
			"Anda tidak diizinkan membuka halaman ini.",
		);
		return null;
	}

	const detail = await getDocumentDetail(id);
	if (!detail) notFound();

	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<PersuratanDetailClient detail={detail} />
			</PageShell>
		</>
	);
}
