import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	sheetTargets,
	presencePoints,
	schedules,
	terminals,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { SheetDetailClient } from "@/features/presence/components/sheet-detail-client";
import { fetchAllOrgUnits } from "@/lib/google-api";
import { PageShell } from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";

export default async function SheetDetailPage({
	params,
}: {
	params: Promise<{ sheetId: string }>;
}) {
	const resolvedParams = await params;
	const sheetId = parseInt(resolvedParams.sheetId, 10);
	await requirePermissionOrRedirect("presence");
	return (
		<PageShell>
			<Suspense fallback={<SuspenseSpinner className="h-96 w-full" />}>
				<SheetDetailFetcher sheetId={sheetId} />
			</Suspense>
		</PageShell>
	);
}

async function SheetDetailFetcher({ sheetId }: { sheetId: number }) {
	const db = await getDb();

	const [sheet] = await db
		.select()
		.from(attendanceSheets)
		.where(eq(attendanceSheets.id, sheetId));

	if (!sheet) {
		return <div className="p-4 text-center">Lembar tidak ditemukan.</div>;
	}

	const targets = await db
		.select()
		.from(sheetTargets)
		.where(eq(sheetTargets.sheetId, sheetId));
	const points = await db
		.select()
		.from(presencePoints)
		.where(eq(presencePoints.sheetId, sheetId));
	const sheetSchedules = await db
		.select()
		.from(schedules)
		.where(eq(schedules.sheetId, sheetId));

	const allTerminals = await db.select().from(terminals).all();

	const orgUnits = await fetchAllOrgUnits();

	return (
		<SheetDetailClient
			sheet={sheet}
			targets={targets}
			points={points}
			schedules={sheetSchedules}
			terminals={allTerminals}
			orgUnits={orgUnits}
		/>
	);
}
