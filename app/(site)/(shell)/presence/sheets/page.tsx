import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	pointSchedules,
	presencePoints,
} from "@/lib/db/schema";
import { Suspense } from "react";
import { SheetsListClient } from "@/features/presence/components/sheets-list-client";
import { PageShell } from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";
import { requireSuperUserOrRedirect } from "@/features/access-management/actions/require-superuser";

export default async function PresenceSheetsPage() {
	await requireSuperUserOrRedirect();
	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<Suspense fallback={<SuspenseSpinner />}>
					<SheetsFetcher />
				</Suspense>
			</PageShell>
		</>
	);
}

async function SheetsFetcher() {
	const db = await getDb();

	// Fetch all sheets
	const allSheets = await db.select().from(attendanceSheets);
	const [allPoints, allSchedules] = await Promise.all([
		db.select().from(presencePoints),
		db.select().from(pointSchedules),
	]);
	const sheetIdByPointId = new Map(allPoints.map((p) => [p.id, p.sheetId]));

	// Calculate date ranges
	const structuredSheets = allSheets.map((sheet) => {
		const dates = allSchedules
			.filter((s) => sheetIdByPointId.get(s.presencePointId) === sheet.id)
			.map((s) => s.date)
			.sort();

		let dateRange = "Belum ada jadwal";
		if (dates.length > 0) {
			const first = dates[0];
			const last = dates[dates.length - 1];
			dateRange = first === last ? first : `${first} s/d ${last}`;
		}

		return {
			...sheet,
			dateRange,
		};
	});

	return <SheetsListClient initialSheets={structuredSheets} />;
}
