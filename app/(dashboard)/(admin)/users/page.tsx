import { fetchAllWorkspaceUsers } from "@/lib/username-generator";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload } from "lucide-react";

export default function UsersPage() {
	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Daftar Pengguna</h1>
				</div>
				<Button asChild>
					<Link href="/bulk-upload">
						<Upload className="mr-2 h-4 w-4" /> Unggah Massal Pengguna
					</Link>
				</Button>
			</div>

			<div className="rounded-md border bg-background">
				<Suspense fallback={<TableSkeleton />}>
					<UsersTable />
				</Suspense>
			</div>
		</div>
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
