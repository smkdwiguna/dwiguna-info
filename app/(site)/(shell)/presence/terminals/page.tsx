import { getDb } from "@/lib/db";
import { terminals } from "@/lib/db/schema";
import { Suspense } from "react";
import { TerminalsListClient } from "@/features/presence/components/terminals-list-client";
import { PageShell } from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import { requireSuperUserOrRedirect } from "@/features/access-management/actions/require-superuser";

export default async function PresenceTerminalsPage() {
	await requireSuperUserOrRedirect();
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
	const rows = await db.select().from(terminals);
	const allTerminals = rows.map(({ password, ...terminal }) => ({
		...terminal,
		hasPassword: Boolean(password && password.length > 0),
	}));

	return <TerminalsListClient initialTerminals={allTerminals} />;
}
