import { getDb } from "@/lib/db";
import { deviceUsers } from "@/lib/db/schema";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllOrgUnits } from "@/lib/google-api";
import { DeviceUsersClient } from "@/features/presence/components/device-users-client";
import { PageShell } from "@/components/ui/page-header";

export default function PresenceDeviceUsersPage() {
	return (
		<PageShell>
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<DeviceUsersFetcher />
			</Suspense>
		</PageShell>
	);
}

async function DeviceUsersFetcher() {
	try {
		const db = await getDb();
		const allUsers = await db.select().from(deviceUsers).all();
		const orgUnits = await fetchAllOrgUnits();

		return <DeviceUsersClient initialUsers={allUsers} orgUnits={orgUnits} />;
	} catch (error: any) {
		return (
			<div className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-center mt-4">
				<h3 className="text-lg font-bold text-destructive mb-2">
					Error
				</h3>
				<p className="text-sm text-destructive/80 max-w-lg mx-auto">
					{error.message}
				</p>
			</div>
		);
	}
}
