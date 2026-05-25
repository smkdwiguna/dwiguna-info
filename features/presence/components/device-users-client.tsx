"use client";

import { useState } from "react";
import { Plus, Trash2, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteDeviceUser } from "../actions/device-users";
import { assignMissingDeviceIds } from "../actions/assign-device-ids";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

export function DeviceUsersClient({
	initialUsers,
	orgUnits,
}: {
	initialUsers: any[];
	orgUnits: string[];
}) {
	const [users, setUsers] = useState(initialUsers);
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [targetOrg, setTargetOrg] = useState("");
	const router = useRouter();

	const handleSync = async () => {
		if (!targetOrg) return toast.error("Pilih unit organisasi terlebih dahulu");

		setIsSubmitting(true);
		try {
			const result = await assignMissingDeviceIds(targetOrg);
			toast.success(`Berhasil! ${result.newAssignments} ID baru dibagikan.`);
			setIsOpen(false);
			router.refresh();
		} catch (error: any) {
			toast.error(`Gagal sinkronisasi: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: number, email: string) => {
		toast("Konfirmasi Hapus", {
			description: `Hapus ID untuk pengguna "${email}"?`,
			action: {
				label: "Hapus",
				onClick: async () => {
					try {
						await deleteDeviceUser(id);
						setUsers(users.filter((u) => u.id !== id));
						toast.success("Pengguna perangkat terhapus.");
					} catch (e) {
						toast.error("Gagal menghapus pengguna.");
					}
				},
			},
			cancel: { label: "Batal", onClick: () => {} },
		});
	};

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>ID Pengguna Perangkat</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button onClick={() => setIsOpen(true)}>
						<Plus className="w-4 h-4 mr-2" />
						Sinkronisasi Unit Org
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="rounded-md border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-24">ID</TableHead>
							<TableHead>Email Akun Workspace</TableHead>
							<TableHead>Sidik Jari</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-muted-foreground h-24">
									Belum ada pengguna yang memiliki ID Perangkat.
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-mono font-bold text-lg">{String(user.id).padStart(3, '0')}</TableCell>
									<TableCell>{user.email}</TableCell>
									<TableCell>
										{user.fingerprint ? (
											<span className="flex items-center gap-1 text-green-600 text-xs">
												<Fingerprint className="w-4 h-4" /> Terdaftar
											</span>
										) : (
											<span className="text-muted-foreground text-xs italic">Belum ada</span>
										)}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(user.id, user.email)}
										>
											<Trash2 className="w-4 h-4 text-destructive" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Bagi ID Perangkat Baru</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<p className="text-sm text-muted-foreground">
							Fungsi ini akan memeriksa semua akun di dalam Unit Organisasi yang dipilih. Jika ada akun yang belum memiliki ID Perangkat (0-999), sistem akan membagikan ID yang masih kosong kepada mereka.
						</p>
						<div className="space-y-2">
							<Label>Pilih Unit Organisasi</Label>
							<Select value={targetOrg} onValueChange={setTargetOrg}>
								<SelectTrigger>
									<SelectValue placeholder="Pilih unit..." />
								</SelectTrigger>
								<SelectContent>
									{orgUnits.map((ou) => (
										<SelectItem key={ou} value={ou}>
											{ou}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
							Batal
						</Button>
						<Button onClick={handleSync} disabled={isSubmitting}>
							{isSubmitting ? "Memproses..." : "Sinkronisasi Sekarang"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
