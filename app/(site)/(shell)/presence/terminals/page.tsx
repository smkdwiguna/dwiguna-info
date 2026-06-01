import { getDb } from "@/lib/db";
import { terminals } from "@/lib/db/schema";
import { Suspense } from "react";
import { TerminalsListClient } from "@/features/presence/components/terminals-list-client";
import { PageShell } from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";

export default function PresenceTerminalsPage() {
	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<Suspense fallback={<SuspenseSpinner />}>
					<TerminalsFetcher />
				</Suspense>
			</PageShell>
		</>
	);
}

async function TerminalsFetcher() {
	const db = await getDb();
	const allTerminals = await db.select().from(terminals).all();

	return <TerminalsListClient initialTerminals={allTerminals} />;
}
