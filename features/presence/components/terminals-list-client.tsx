"use client";

import { useState } from "react";
import { Plus, Trash2, Edit, Check, X, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	createTerminal,
	updateTerminal,
	deleteTerminal,
	syncAllFingerprints,
} from "../actions/terminals";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";
import { ButtonGroup } from "@/components/ui/button-group";

export function TerminalsListClient({
	initialTerminals,
}: {
	initialTerminals: any[];
}) {
	const [terminals, setTerminals] = useState(initialTerminals);
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	const [id, setId] = useState("");
	const [name, setName] = useState("");

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");

	const handleCreate = async () => {
		if (!id || !name) return toast.error("ID dan nama harus diisi");

		setIsSubmitting(true);
		try {
			await createTerminal({ id, name });
			toast.success("Perangkat berhasil ditambahkan!");
			setIsOpen(false);
			setTerminals([...terminals, { id, name, status: "Standby" }]);
			setId("");
			setName("");
		} catch (error: any) {
			toast.error(`Gagal menambah perangkat: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (targetId: string, terminalName: string) => {
		toast("Konfirmasi Hapus", {
			description: `Hapus perangkat "${terminalName}"?`,
			action: {
				label: "Hapus",
				onClick: async () => {
					try {
						await deleteTerminal(targetId);
						setTerminals(terminals.filter((t) => t.id !== targetId));
						toast.success("Perangkat terhapus.");
					} catch (e) {
						toast.error("Gagal menghapus perangkat.");
					}
				},
			},
			cancel: { label: "Batal", onClick: () => {} },
		});
	};

	const handleUpdateName = async (targetId: string) => {
		try {
			await updateTerminal({ id: targetId, name: editName });
			setTerminals(
				terminals.map((t) =>
					t.id === targetId ? { ...t, name: editName } : t,
				),
			);
			setEditingId(null);
			toast.success("Nama perangkat diperbarui");
		} catch (e) {
			toast.error("Gagal menghapus perangkat");
		}
	};

	const handleSync = async (terminalId: string) => {
		try {
			const res = await syncAllFingerprints(terminalId);
			toast.success(`Berhasil mengantrekan sinkronisasi ${res.count} sidik jari! Perangkat akan mulai mengunduhnya perlahan.`);
		} catch (e: any) {
			toast.error("Gagal memulai sinkronisasi: " + e.message);
		}
	};

	const isTerminalOnline = (lastSeenAt: number | null) => {
		if (!lastSeenAt) return false;
		const diff = Date.now() / 1000 - lastSeenAt;
		return diff <= 120; // 2 minutes
	};

	const getSyncStatus = (syncQueueStr: string | null) => {
		if (!syncQueueStr) return null;
		try {
			const queue = JSON.parse(syncQueueStr);
			if (Array.isArray(queue) && queue.length > 0) {
				return `Menyinkronkan... (${queue.length} tersisa)`;
			}
		} catch (e) {}
		return null;
	};

	const formatStatus = (status: string) => {
		switch (status) {
			case "1": return "Membuka Gerbang";
			case "2": return "Mendaftarkan Sidik Jari";
			case "3": return "Menyalin Sidik Jari";
			case "4": return "Mengambil Sidik Jari";
			case "5": return "Menghapus Sidik Jari";
			case "6": return "Mereset Perangkat";
			case "7": return "Menampilkan Info";
			case "0": return "Standby";
			default: return status === "INHERIT" ? "Standby" : status;
		}
	};

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Terminal Presensi</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button onClick={() => setIsOpen(true)}>
						<Plus className="w-4 h-4" />
						Tambah Perangkat
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="rounded-md border bg-background">
				<Table>
					<TableBody>
						{terminals.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center text-muted-foreground h-24"
								>
									Belum ada perangkat yang terdaftar.
								</TableCell>
							</TableRow>
						) : (
							terminals.map((terminal) => (
								<TableRow key={terminal.id}>
									<TableCell className="font-bold pl-4">
										{editingId === terminal.id ? (
											<div className="flex items-center gap-2">
												<Input
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
													className="h-8 w-50"
												/>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleUpdateName(terminal.id)}
													className="h-8 w-8 text-green-600"
												>
													<Check className="w-4 h-4" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => setEditingId(null)}
													className="h-8 w-8 text-destructive"
												>
													<X className="w-4 h-4" />
												</Button>
											</div>
										) : (
											<div className="flex items-center gap-2">
												<span>{terminal.name}</span>
												<Button
													size="icon"
													variant="secondary"
													className="h-6 w-6 opacity-50 hover:opacity-100"
													onClick={() => {
														setEditingId(terminal.id);
														setEditName(terminal.name);
													}}
												>
													<Edit className="w-3 h-3" />
												</Button>
											</div>
										)}
									</TableCell>
									<TableCell className="font-mono text-sm">
										{terminal.id}
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<div className="flex items-center gap-2">
												<div
													className={`w-2.5 h-2.5 rounded-full ${
														isTerminalOnline(terminal.timeout)
															? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]"
															: "bg-red-500 opacity-80"
													}`}
													title={isTerminalOnline(terminal.timeout) ? "Online" : "Offline"}
												/>
												<span className="font-medium">{formatStatus(terminal.status)}</span>
											</div>
											{getSyncStatus(terminal.syncQueue) && (
												<span className="text-xs text-muted-foreground italic mt-1">
													{getSyncStatus(terminal.syncQueue)}
												</span>
											)}
										</div>
									</TableCell>

									<TableCell className="flex justify-end">
										<ButtonGroup>
											<Button 
												variant="outline" 
												size="icon" 
												onClick={() => handleSync(terminal.id)}
												title="Sinkronisasi Seluruh Sidik Jari"
											>
												<RefreshCcw className="w-4 h-4" />
											</Button>
											<Button
												size="icon"
												variant="outline"
												aria-label="Edit"
												onClick={() => handleDelete(terminal.id, terminal.name)}
											>
												<Trash2 className="w-4 h-4 text-destructive" />
											</Button>
										</ButtonGroup>
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
						<DialogTitle>Tambah Perangkat</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>ID Terminal</Label>
							<Input
								placeholder="Contoh: 2A9C"
								value={id}
								onChange={(e) => setId(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Nama / Label</Label>
							<Input
								placeholder="Contoh: Scanner Gerbang Utama"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
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
						<Button onClick={handleCreate} disabled={isSubmitting}>
							{isSubmitting ? "Menyimpan..." : "Simpan Perangkat"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
