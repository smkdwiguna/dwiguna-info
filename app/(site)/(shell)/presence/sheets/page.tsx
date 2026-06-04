import { getDb } from "@/lib/db";
import { attendanceSheets, schedules } from "@/lib/db/schema";
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
	const allSheets = await db.select().from(attendanceSheets).all();
	const allSchedules = await db.select().from(schedules).all();

	// Calculate date ranges
	const structuredSheets = allSheets.map((sheet) => {
		const sheetSchedules = allSchedules.filter((s) => s.sheetId === sheet.id);
		const dates = sheetSchedules.map((s) => s.date).sort();

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
