import { getDb } from "@/lib/db";
import { terminals } from "@/lib/db/schema";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TerminalsListClient } from "@/features/presence/components/terminals-list-client";
import { PageShell } from "@/components/ui/page-header";

export default function PresenceTerminalsPage() {
	return (
		<PageShell>
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<TerminalsFetcher />
			</Suspense>
		</PageShell>
	);
}

async function TerminalsFetcher() {
	try {
		const db = await getDb();
		const allTerminals = await db.select().from(terminals).all();

		return <TerminalsListClient initialTerminals={allTerminals} />;
	} catch (error: any) {
		return (
			<div className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-center mt-4">
				<h3 className="text-lg font-bold text-destructive mb-2">
					Database Error
				</h3>
				<p className="text-sm text-destructive/80 max-w-lg mx-auto">
					{error.message}
				</p>
			</div>
		);
	}
}
