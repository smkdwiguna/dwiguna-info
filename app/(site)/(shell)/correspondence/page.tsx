import { PageShell } from "@/components/ui/page-header";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import {
	getCorrespondenceContext,
} from "@/features/correspondence/actions/access";
import { listDocuments } from "@/features/correspondence/actions/documents";
import { redirectToDashboardWithFlash } from "@/features/access-management/actions/require-permission";
import { CorrespondenceListClient } from "@/features/correspondence/components/correspondence-list-client";
import { listWorkspaceUserOptions } from "@/features/correspondence/actions/users";

export const dynamic = "force-dynamic";

export default async function CorrespondencePage() {
	const ctx = await getCorrespondenceContext();
	if (!ctx || !ctx.visible) {
		await redirectToDashboardWithFlash(
			"Anda tidak diizinkan membuka halaman ini.",
		);
		return null;
	}

	const [documents, users] = await Promise.all([
		listDocuments(),
		ctx.canUpload ? listWorkspaceUserOptions() : Promise.resolve([]),
	]);

	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<CorrespondenceListClient
					documents={documents}
					canUpload={ctx.canUpload}
					users={users}
				/>
			</PageShell>
		</>
	);
}
