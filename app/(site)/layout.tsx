import { getServerSession } from "@/lib/server-session";
import { SiteLayout } from "@/features/site-shell/components/site-layout";
import Login from "@/components/login";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";
import { getInventories } from "@/features/inventory/actions/inventory";
import { isCorrespondenceVisible } from "@/features/correspondence/actions/documents";
import { hasAnyGrades } from "@/features/academic/actions/grading";

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
	let showCorrespondence = false;
	let showAcademic = false;
	try {
		const [livePermissions, inventories, correspondenceVisible, studentGrades] =
			await Promise.all([
				getLivePermissions(),
				getInventories(),
				isCorrespondenceVisible(),
				hasAnyGrades(userEmail),
			]);
		permissions = livePermissions.permissions;
		inventoryEntries = inventories.map((inventory) => ({
			id: inventory.id,
			name: inventory.name,
		}));
		showCorrespondence = correspondenceVisible;
		showAcademic =
			livePermissions.isSuperUser ||
			permissions.includes("academic") ||
			userEmail.toLowerCase().includes("/guru") ||
			studentGrades;
	} catch (error) {
		console.error("Failed to preload site shell data", error);
	}

	return (
		<SiteLayout
			userEmail={userEmail}
			permissions={permissions}
			inventoryEntries={inventoryEntries}
			showCorrespondence={showCorrespondence}
			showAcademic={showAcademic}
		>
			{children}
		</SiteLayout>
	);
}
