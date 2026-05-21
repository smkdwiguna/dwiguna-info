"use client";

import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UsersTableClient({ users }: { users: any[] }) {
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 20;

	const totalPages = Math.ceil(users.length / rowsPerPage);
	const startIndex = (currentPage - 1) * rowsPerPage;
	const currentUsers = users.slice(startIndex, startIndex + rowsPerPage);

	return (
		<div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12.5"></TableHead>
						<TableHead>Nama Lengkap</TableHead>
						<TableHead>Alamat Email</TableHead>
						<TableHead>Unit Organisasi</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentUsers.map((user) => (
						<TableRow
							key={user.id || user.primaryEmail}
							className={user.suspended && "font-light italic opacity-50"}
						>
							<TableCell>
								<Avatar className="size-8 ml-1.5">
									<AvatarImage
										referrerPolicy="no-referrer"
										src={user.thumbnailPhotoUrl ?? undefined}
										alt={user.name?.fullName || ""}
									/>
									<AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold not-italic">
										{user.name?.fullName?.charAt(0).toUpperCase() || "?"}
									</AvatarFallback>
								</Avatar>
							</TableCell>
							<TableCell className="font-medium">
								{user.name?.fullName || "-"}
							</TableCell>
							<TableCell>{user.primaryEmail}</TableCell>
							<TableCell>{user.orgUnitPath || "/"}</TableCell>
							<TableCell className="text-right">
								<Button variant="ghost" size="icon" aria-label="Edit">
									<Edit />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div className="flex items-center justify-between px-4 py-4 border-t">
				<div className="text-sm text-muted-foreground">
					Menampilkan {startIndex + 1} -{" "}
					{Math.min(startIndex + rowsPerPage, users.length)} dari {users.length}{" "}
					pengguna
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={currentPage === 1}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
