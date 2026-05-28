import { getDb } from "@/lib/db";
import { deviceUsers, terminals } from "@/lib/db/schema";
import { Suspense } from "react";
import { fetchAllOrgUnits } from "@/lib/google-api";
import { fetchAllWorkspaceUsers } from "@/lib/username-generator";
import { DeviceUsersClient } from "@/features/presence/components/device-users-client";
import { PageShell } from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";

export default function PresenceDeviceUsersPage() {
	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<Suspense fallback={<SuspenseSpinner className="h-96 w-full" />}>
					<DeviceUsersFetcher />
				</Suspense>
			</PageShell>
		</>
	);
}

async function DeviceUsersFetcher() {
	try {
		const db = await getDb();
		const allUsers = await db.select().from(deviceUsers).all();
		const allTerminals = await db.select().from(terminals).all();
		const orgUnits = await fetchAllOrgUnits();
		const workspaceUsers = await fetchAllWorkspaceUsers();

		const usersMap = new Map();
		for (const u of workspaceUsers) {
			if (u.primaryEmail) {
				usersMap.set(u.primaryEmail, {
					name: u.name?.fullName || "-",
					orgUnit: u.orgUnitPath || "-",
				});
			}
		}

		const enrichedUsers = allUsers.map((u) => ({
			...u,
			name: usersMap.get(u.email)?.name || "-",
			orgUnit: usersMap.get(u.email)?.orgUnit || "-",
		}));

		return (
			<DeviceUsersClient
				initialUsers={enrichedUsers}
				orgUnits={orgUnits}
				terminals={allTerminals}
			/>
		);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return (
			<div className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-center mt-4">
				<h3 className="text-lg font-bold text-destructive mb-2">Error</h3>
				<p className="text-sm text-destructive/80 max-w-lg mx-auto">
					{message}
				</p>
			</div>
		);
	}
}
