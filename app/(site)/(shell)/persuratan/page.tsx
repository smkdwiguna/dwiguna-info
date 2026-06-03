import { PageShell } from "@/components/ui/page-header";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import {
	getPersuratanContext,
} from "@/features/persuratan/actions/access";
import { listDocuments } from "@/features/persuratan/actions/documents";
import { redirectToDashboardWithFlash } from "@/features/access-management/actions/require-permission";
import { PersuratanListClient } from "@/features/persuratan/components/persuratan-list-client";

export const dynamic = "force-dynamic";

export default async function PersuratanPage() {
	const ctx = await getPersuratanContext();
	if (!ctx || !ctx.visible) {
		await redirectToDashboardWithFlash(
			"Anda tidak diizinkan membuka halaman ini.",
		);
		return null;
	}

	const documents = await listDocuments();

	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<PersuratanListClient documents={documents} canUpload={ctx.canUpload} />
			</PageShell>
		</>
	);
}
