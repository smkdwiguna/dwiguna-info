import { Suspense } from "react";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

import { AccessManagementClient } from "@/features/workspace-admin/components/access-management-client";
import { requireSuperUserOrRedirect } from "@/features/workspace-admin/actions/require-permission";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
	await requireSuperUserOrRedirect();
	const { getAccessList } =
		await import("@/features/workspace-admin/actions/get-access-list");
	const users = await getAccessList();

	return (
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
	);
}
