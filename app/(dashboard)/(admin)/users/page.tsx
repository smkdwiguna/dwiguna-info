import { fetchAllWorkspaceUsers } from "@/lib/username-generator";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BulkPhotoUploadClient } from "@/features/workspace-admin/components/bulk-photo-upload-client";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function UsersPage() {
	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Daftar Pengguna</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<BulkPhotoUploadClient />
					<Button asChild>
						<Link href="/bulk-upload">
							<Plus className="h-4 w-4" /> Tambah Pengguna
						</Link>
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="rounded-md border bg-background">
				<Suspense fallback={<TableSkeleton />}>
					<UsersTable />
				</Suspense>
			</div>
		</PageShell>
	);
}

import { UsersTableClient } from "@/features/workspace-admin/components/users-table-client";

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

function TableSkeleton() {
	return (
		<div className="p-4 space-y-4">
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
		</div>
	);
}
