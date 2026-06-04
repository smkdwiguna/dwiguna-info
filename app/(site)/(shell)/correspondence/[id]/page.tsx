import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/page-header";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import { getCorrespondenceContext } from "@/features/correspondence/actions/access";
import { getDocumentDetail } from "@/features/correspondence/actions/documents";
import { redirectToDashboardWithFlash } from "@/features/access-management/actions/require-permission";
import { CorrespondenceDetailClient } from "@/features/correspondence/components/correspondence-detail-client";
import { listWorkspaceUserOptions } from "@/features/correspondence/actions/users";

export const dynamic = "force-dynamic";

export default async function CorrespondenceDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const ctx = await getCorrespondenceContext();
	if (!ctx || !ctx.visible) {
		await redirectToDashboardWithFlash(
			"Anda tidak diizinkan membuka halaman ini.",
		);
		return null;
	}

	const detail = await getDocumentDetail(id);
	if (!detail) notFound();

	const users = detail.canManage ? await listWorkspaceUserOptions() : [];

	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<CorrespondenceDetailClient detail={detail} users={users} />
			</PageShell>
		</>
	);
}
