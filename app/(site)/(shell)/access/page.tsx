import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

import { requireSuperUserOrRedirect } from "@/features/access-management/actions/require-superuser";
import { AccessManagementPage } from "./access-management-page";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
	await requireSuperUserOrRedirect();

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

				<AccessManagementPage />
			</PageShell>
		</>
	);
}
