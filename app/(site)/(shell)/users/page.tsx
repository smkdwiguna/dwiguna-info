import { fetchAllWorkspaceUsers } from "@/lib/username-generator";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BulkPhotoUploadClient } from "@/features/workspace-admin/components/bulk-photo-upload-client";
import { BulkPassUploadClient } from "@/features/workspace-admin/components/bulk-pass-upload-client";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
	await requirePermissionOrRedirect("users");
	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<PageHeader>
					<PageHeaderHeading>
						<PageHeaderTitle>Daftar Pengguna</PageHeaderTitle>
					</PageHeaderHeading>
					<PageHeaderActions>
						<BulkPhotoUploadClient />
						<BulkPassUploadClient />
						<Button asChild>
							<Link href="/users/bulk-upload">
								<Plus className="h-4 w-4" /> Tambah Pengguna
							</Link>
						</Button>
					</PageHeaderActions>
				</PageHeader>

				<div className="rounded-md border bg-background">
					<Suspense fallback={<SuspenseSpinner />}>
						<UsersTable />
					</Suspense>
				</div>
			</PageShell>
		</>
	);
}

import { UsersTableClient } from "@/features/workspace-admin/components/users-table-client";
import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";

async function UsersTable() {
	const users = await fetchAllWorkspaceUsers();

	if (!users || users.length === 0) {
		return (
			<div className="p-4 text-center text-muted-foreground">
				Tidak ada pengguna ditemukan.
			</div>
		);
	}

	return <UsersTableClient users={users} />;
}
