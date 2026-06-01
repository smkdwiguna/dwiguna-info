import { PageShell } from "@/components/ui/page-header";
import { assertInventoryGlobalAccess } from "@/features/inventory/actions/inventory";
import { isSuperUser } from "@/lib/access";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";
import { InventoryPageClient } from "./inventory-page-client";

export default async function InventoryPage() {
	const [userEmail, livePermissions] = await Promise.all([
		assertInventoryGlobalAccess(),
		getLivePermissions(),
	]);

	const canCreateInventory =
		isSuperUser(userEmail) || livePermissions.permissions.includes("inventory");

	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<InventoryPageClient
					isGlobalAdmin={isSuperUser(userEmail)}
					canCreateInventory={canCreateInventory}
				/>
			</PageShell>
		</>
	);
}
