import { getServerSession } from "@/lib/server-session";
import { SiteLayout } from "@/features/site-shell/components/site-layout";
import Login from "@/components/login";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";
import { getInventories } from "@/features/inventory/actions/inventory";
import { isPersuratanVisible } from "@/features/persuratan/actions/documents";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();
	const userEmail = session?.user?.email;

	if (!userEmail) {
		return <Login />;
	}

	let permissions: string[] = [];
	let inventoryEntries: { id: number; name: string }[] = [];
	let showPersuratan = false;
	try {
		const [livePermissions, inventories, persuratanVisible] = await Promise.all([
			getLivePermissions(),
			getInventories(),
			isPersuratanVisible(),
		]);
		permissions = livePermissions.permissions;
		inventoryEntries = inventories.map((inventory) => ({
			id: inventory.id,
			name: inventory.name,
		}));
		showPersuratan = persuratanVisible;
	} catch (error) {
		console.error("Failed to preload site shell data", error);
	}

	return (
		<SiteLayout
			userEmail={userEmail}
			permissions={permissions}
			inventoryEntries={inventoryEntries}
			showPersuratan={showPersuratan}
		>
			{children}
		</SiteLayout>
	);
}
