import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";
import { ShortLinksPage } from "@/features/short-links/components/short-links-page";

export const dynamic = "force-dynamic";

export default async function ShortlinkPage() {
	await requirePermissionOrRedirect("shortlink");

	return (
		<>
			<RouteRefreshPoller />
			<ShortLinksPage />
		</>
	);
}
