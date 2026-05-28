import { Suspense } from "react";
import { PageShell } from "@/components/ui/page-header";
import { getInventoryDetail } from "@/features/inventory/actions/inventory";
import { InventoryDetailClient } from "./inventory-detail-client";
import { redirectToDashboardWithFlash } from "@/features/workspace-admin/actions/require-permission";
import { fetchAllWorkspaceUsers } from "@/lib/username-generator";
import { SuspenseSpinner } from "@/components/suspense-spinner";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function InventoryDetailPage({ params }: PageProps) {
	const { id } = await params;
	const inventoryId = parseInt(id, 10);
	let detailData;
	let workspaceUsers;
	try {
		[detailData, workspaceUsers] = await Promise.all([
			getInventoryDetail(inventoryId),
			fetchAllWorkspaceUsers().catch(() => []),
		]);
	} catch (error) {
		if (error instanceof Error && error.message.includes("FORBIDDEN")) {
			await redirectToDashboardWithFlash(
				"Anda tidak memiliki akses ke inventaris ini",
			);
		}
		throw error;
	}

	return (
		<PageShell>
			<Suspense fallback={<SuspenseSpinner className="h-96 w-full" />}>
				<InventoryDetailClient
					initialData={detailData}
					workspaceUsers={workspaceUsers}
				/>
			</Suspense>
		</PageShell>
	);
}
