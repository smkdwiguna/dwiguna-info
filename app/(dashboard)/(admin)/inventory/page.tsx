import { Suspense } from "react";
import { PageShell } from "@/components/ui/page-header";
import {
	getInventories,
	assertInventoryGlobalAccess,
} from "@/features/inventory/actions/inventory";
import { InventoryListClient } from "./inventory-list-client";
import { isSuperUser } from "@/lib/access";
import {
	redirectToDashboardWithFlash,
	getLivePermissions,
} from "@/features/workspace-admin/actions/require-permission";
import { SuspenseSpinner } from "@/components/suspense-spinner";

export default async function InventoryPage() {
	const [userEmail, livePermissions, inventories] = await Promise.all([
		assertInventoryGlobalAccess(),
		getLivePermissions(),
		getInventories(),
	]);

	const canCreateInventory =
		isSuperUser(userEmail) || livePermissions.permissions.includes("inventory");
	const canOpenInventory =
		isSuperUser(userEmail) || canCreateInventory || inventories.length > 0;

	if (!canOpenInventory) {
		await redirectToDashboardWithFlash(
			"Anda tidak memiliki akses ke halaman inventaris",
		);
	}

	return (
		<PageShell>
			<Suspense fallback={<SuspenseSpinner className="h-96 w-full" />}>
				<InventoryListWrapper
					initialInventories={inventories}
					isGlobalAdmin={isSuperUser(userEmail)}
					canCreateInventory={canCreateInventory}
				/>
			</Suspense>
		</PageShell>
	);
}

async function InventoryListWrapper({
	initialInventories,
	isGlobalAdmin,
	canCreateInventory,
}: {
	initialInventories: Awaited<ReturnType<typeof getInventories>>;
	isGlobalAdmin: boolean;
	canCreateInventory: boolean;
}) {
	return (
		<InventoryListClient
			initialInventories={initialInventories}
			isGlobalAdmin={isGlobalAdmin}
			canCreateInventory={canCreateInventory}
		/>
	);
}
