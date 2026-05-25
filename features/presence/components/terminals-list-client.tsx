"use client";

import { useState } from "react";
import { Plus, Trash2, Edit, Check, X, RefreshCw } from "lucide-react";
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
import { createTerminal, updateTerminal, deleteTerminal } from "../actions/terminals";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

export function TerminalsListClient({ initialTerminals }: { initialTerminals: any[] }) {
	const [terminals, setTerminals] = useState(initialTerminals);
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	const [id, setId] = useState("");
	const [name, setName] = useState("");
	
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");

	const handleCreate = async () => {
		if (!id || !name) return toast.error("ID/MAC dan Nama harus diisi");

		setIsSubmitting(true);
		try {
			await createTerminal({ id, name });
			toast.success("Perangkat berhasil ditambahkan!");
			setIsOpen(false);
			setTerminals([...terminals, { id, name, status: "INHERIT" }]);
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
			setTerminals(terminals.map(t => t.id === targetId ? { ...t, name: editName } : t));
			setEditingId(null);
			toast.success("Nama perangkat diperbarui");
		} catch (e) {
			toast.error("Gagal memperbarui perangkat");
		}
	};

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Perangkat Presensi</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button onClick={() => setIsOpen(true)}>
						<Plus className="w-4 h-4 mr-2" />
						Tambah Perangkat
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="rounded-md border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nama Perangkat</TableHead>
							<TableHead>ID / MAC Address</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{terminals.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-muted-foreground h-24">
									Belum ada perangkat yang terdaftar.
								</TableCell>
							</TableRow>
						) : (
							terminals.map((terminal) => (
								<TableRow key={terminal.id}>
									<TableCell className="font-medium">
										{editingId === terminal.id ? (
											<div className="flex items-center gap-2">
												<Input
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
													className="h-8 w-[200px]"
												/>
												<Button size="icon" variant="ghost" onClick={() => handleUpdateName(terminal.id)} className="h-8 w-8 text-green-600">
													<Check className="w-4 h-4" />
												</Button>
												<Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-destructive">
													<X className="w-4 h-4" />
												</Button>
											</div>
										) : (
											<div className="flex items-center gap-2">
												<span>{terminal.name}</span>
												<Button
													size="icon"
													variant="ghost"
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
									<TableCell className="font-mono text-sm">{terminal.id}</TableCell>
									<TableCell>{terminal.status}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(terminal.id, terminal.name)}
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
						<DialogTitle>Tambah Perangkat Baru</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>ID / MAC Address</Label>
							<Input
								placeholder="Contoh: 00:1B:44:11:3A:B7"
								value={id}
								onChange={(e) => setId(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Nama Perangkat</Label>
							<Input
								placeholder="Contoh: Scanner Gerbang Utama"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
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
