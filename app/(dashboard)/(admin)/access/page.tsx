import { Suspense } from "react";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

import { AccessManagementClient } from "@/features/workspace-admin/components/access-management-client";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
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

			<Suspense>
				{/* client component */}
				<AccessManagementClient users={users} />
			</Suspense>
		</PageShell>
	);
}
