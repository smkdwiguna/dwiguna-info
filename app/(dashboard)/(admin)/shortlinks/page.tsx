import { requirePermissionOrRedirect } from "@/features/workspace-admin/actions/require-permission";
import { getCurrentUserShortLinks } from "@/features/short-links/actions/short-links";
import { ShortLinksClient } from "@/features/short-links/components/short-links-client";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";

export const dynamic = "force-dynamic";

export default async function ShortlinkPage() {
	await requirePermissionOrRedirect("shortlink");
	const shortLinks = await getCurrentUserShortLinks();

	return (
		<>
			<RouteRefreshPoller />
			<ShortLinksClient initialShortLinks={shortLinks} />
		</>
	);
}
