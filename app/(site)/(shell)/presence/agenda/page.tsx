import { Suspense } from "react";
import { PageShell } from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";
import { getAgendaData } from "@/features/presence/actions/agenda";
import { AgendaClient } from "@/features/presence/components/agenda-client";

export default async function AgendaPage() {
	await requirePermissionOrRedirect("presence.edit.sheets");
	return (
		<PageShell>
			<Suspense fallback={<SuspenseSpinner />}>
				<AgendaFetcher />
			</Suspense>
		</PageShell>
	);
}

async function AgendaFetcher() {
	const data = await getAgendaData();
	return <AgendaClient data={data} />;
}
