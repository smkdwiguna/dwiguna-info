import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	sheetTargets,
	presencePoints,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDetailClient } from "@/features/presence/components/sheet-detail-client";
import { fetchAllOrgUnits } from "@/lib/google-api";

export default async function SheetDetailPage({
	params,
}: {
	params: Promise<{ sheetId: string }>;
}) {
	const resolvedParams = await params;
	const sheetId = parseInt(resolvedParams.sheetId, 10);

	return (
		<div className="space-y-4">
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<SheetDetailFetcher sheetId={sheetId} />
			</Suspense>
		</div>
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

	const orgUnits = await fetchAllOrgUnits();

	return (
		<SheetDetailClient
			sheet={sheet}
			targets={targets}
			points={points}
			orgUnits={orgUnits}
		/>
	);
}
