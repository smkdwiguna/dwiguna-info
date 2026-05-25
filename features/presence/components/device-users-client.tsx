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
import { deleteDeviceUser, enrollFingerprint } from "../actions/device-users";
import { assignMissingDeviceIds } from "../actions/assign-device-ids";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function DeviceUsersClient({
	initialUsers,
	orgUnits,
	terminals,
}: {
	initialUsers: any[];
	orgUnits: string[];
	terminals: any[];
}) {
	const [users, setUsers] = useState(initialUsers);
	const [searchQuery, setSearchQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [enrollOpen, setEnrollOpen] = useState(false);
	const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<any>(null);
	const [selectedTerminal, setSelectedTerminal] = useState("");
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
			toast.error(`Gagal sinkronisasi pengguna: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEnrollSubmit = async () => {
		if (!selectedTerminal) return toast.error("Pilih terminal terlebih dahulu");
		setIsSubmitting(true);
		try {
			await enrollFingerprint(selectedUserForEnroll.id, selectedTerminal);
			toast.success("Perintah pendaftaran sidik jari dikirim ke perangkat.");
			setEnrollOpen(false);
		} catch (error: any) {
			toast.error(`Gagal memulai pendaftaran: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const filteredUsers = users.filter((u) => {
		const q = searchQuery.toLowerCase();
		return (
			u.email.toLowerCase().includes(q) ||
			(u.name && u.name.toLowerCase().includes(q)) ||
			(u.orgUnit && u.orgUnit.toLowerCase().includes(q)) ||
			String(u.id).includes(q)
		);
	});

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
					<PageHeaderTitle>Pendaftaran Sidik Jari</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button onClick={() => setIsOpen(true)}>
						<Plus className="w-4 h-4" />
						Tambah Pengguna
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="flex justify-between items-center mb-4">
				<Input
					placeholder="Cari ID, Email, Nama, atau Unit Org..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			<div className="rounded-md border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-24">ID</TableHead>
							<TableHead>Nama Lengkap</TableHead>
							<TableHead>Username</TableHead>
							<TableHead>Unit Org</TableHead>
							<TableHead>Sidik Jari</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredUsers.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground h-24"
								>
									Belum ada pengguna yang ditemukan.
								</TableCell>
							</TableRow>
						) : (
							filteredUsers.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-mono font-bold text-lg">
										{String(user.id).padStart(3, "0")}
									</TableCell>
									<TableCell className="font-medium">{user.name}</TableCell>
									<TableCell className="text-muted-foreground">
										{user.email.split("@")[0]}
									</TableCell>
									<TableCell>{user.orgUnit}</TableCell>
									<TableCell>
										{user.fingerprint ? (
											<span className="flex items-center gap-1 text-green-600 text-xs font-bold">
												<Fingerprint className="w-4 h-4" /> Terdaftar
											</span>
										) : (
											<span className="text-muted-foreground text-xs italic">
												Belum ada
											</span>
										)}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-2">
											<Button
												variant="outline"
												size="icon"
												title="Pendaftaran Sidik Jari"
												onClick={() => {
													setSelectedUserForEnroll(user);
													setEnrollOpen(true);
												}}
											>
												<Fingerprint className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDelete(user.id, user.email)}
											>
												<Trash2 className="w-4 h-4 text-destructive" />
											</Button>
										</div>
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
						<DialogTitle>Tambahkan Pengguna Baru</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<p className="text-sm text-muted-foreground">
							Fungsi ini akan memeriksa semua akun di dalam Unit Organisasi yang
							dipilih. Jika ada akun yang belum memiliki ID Sidik Jari (0-999),
							sistem akan membagikan ID yang masih kosong kepada mereka.
						</p>
						<div className="space-y-2">
							<Select value={targetOrg} onValueChange={setTargetOrg}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Pilih unit organisasi..." />
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
						<Button
							variant="outline"
							onClick={() => setIsOpen(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>
						<Button onClick={handleSync} disabled={isSubmitting}>
							{isSubmitting ? "Memproses..." : "Tambah"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pendaftaran Sidik Jari</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<p className="text-sm text-muted-foreground">
							Pilih perangkat terminal tempat Anda akan mendaftarkan sidik jari
							untuk <b>{selectedUserForEnroll?.name}</b> (ID:{" "}
							{String(selectedUserForEnroll?.id).padStart(3, "0")}).
						</p>
						<div className="space-y-2">
							<Label>Pilih Terminal</Label>
							<Select
								value={selectedTerminal}
								onValueChange={setSelectedTerminal}
							>
								<SelectTrigger>
									<SelectValue placeholder="Pilih terminal..." />
								</SelectTrigger>
								<SelectContent>
									{terminals.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEnrollOpen(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>
						<Button onClick={handleEnrollSubmit} disabled={isSubmitting}>
							{isSubmitting ? "Mengirim..." : "Kirim Perintah Pendaftaran"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
