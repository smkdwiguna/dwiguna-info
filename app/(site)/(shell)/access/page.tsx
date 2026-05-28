import { Suspense } from "react";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

import { AccessManagementClient } from "@/features/access-management/components/access-management-client";
import { requireSuperUserOrRedirect } from "@/features/access-management/actions/require-permission";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
	await requireSuperUserOrRedirect();
	const { getAccessList } =
		await import("@/features/access-management/actions/get-access-list");
	const users = await getAccessList();

	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<PageHeader>
					<PageHeaderHeading>
						<PageHeaderTitle>Akses</PageHeaderTitle>
					</PageHeaderHeading>
					<PageHeaderActions />
				</PageHeader>

				<Suspense fallback={<SuspenseSpinner className="min-h-40" />}>
					{/* client component */}
					<AccessManagementClient users={users} />
				</Suspense>
			</PageShell>
		</>
	);
}
