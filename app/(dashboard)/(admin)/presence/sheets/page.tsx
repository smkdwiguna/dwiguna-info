import { getDb } from "@/lib/db";
import { attendanceSheets, schedules } from "@/lib/db/schema";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetsListClient } from "@/features/presence/components/sheets-list-client";

export default function PresenceSheetsPage() {
	return (
		<div className="space-y-4">
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<SheetsFetcher />
			</Suspense>
		</div>
	);
}

async function SheetsFetcher() {
	try {
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
