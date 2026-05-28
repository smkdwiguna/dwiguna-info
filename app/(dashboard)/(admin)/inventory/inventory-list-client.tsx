"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
	createInventory,
	deleteInventory,
} from "@/features/inventory/actions/inventory";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/components/ui/page-header";

interface InventoryRecord {
	id: number;
	name: string;
	createdAt: string;
}

interface InventoryListClientProps {
	initialInventories: InventoryRecord[];
	isGlobalAdmin: boolean;
	canCreateInventory: boolean;
}

export function InventoryListClient({
	initialInventories,
	isGlobalAdmin,
	canCreateInventory,
}: InventoryListClientProps) {
	const router = useRouter();
	const [inventories, setInventories] =
		useState<InventoryRecord[]>(initialInventories);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [selectedInv, setSelectedInv] = useState<InventoryRecord | null>(null);
	const [newName, setNewName] = useState("");

	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setInventories(initialInventories);
	}, [initialInventories]);

	const handleCreate = () => {
		if (!newName.trim()) {
			toast.error("Nama inventaris wajib diisi.");
			return;
		}

		startTransition(async () => {
			try {
				const created = await createInventory(newName);
				setInventories((prev) => [created, ...prev]);
				setIsCreateOpen(false);
				setNewName("");
				toast.success("Inventaris berhasil dibuat.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal membuat inventaris.";
				toast.error(message);
			}
		});
	};

	const handleDelete = () => {
		if (!selectedInv) return;

		startTransition(async () => {
			try {
				await deleteInventory(selectedInv.id);
				setInventories((prev) =>
					prev.filter((inv) => inv.id !== selectedInv.id),
				);
				setIsDeleteOpen(false);
				setSelectedInv(null);
				toast.success("Inventaris berhasil dihapus.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error
						? error.message
						: "Gagal menghapus inventaris.";
				toast.error(message);
			}
		});
	};

	return (
		<div className="space-y-4 animate-in fade-in-50 duration-300">
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Daftar Inventaris</PageHeaderTitle>
				</PageHeaderHeading>
				{canCreateInventory && (
					<PageHeaderActions>
						<Button onClick={() => setIsCreateOpen(true)}>
							<Plus className="w-4 h-4 mr-2" />
							Buat Inventaris Baru
						</Button>
					</PageHeaderActions>
				)}
			</PageHeader>

			<div className="rounded-md border bg-background">
				<Table>
					<TableBody>
						{inventories.map((inv) => (
							<TableRow
								key={inv.id}
								className="cursor-pointer hover:bg-muted/50 transition-colors"
								onClick={() => router.push(`/inventory/${inv.id}`)}
							>
								<TableCell className="pl-4">
									<div className="font-bold text-base">{inv.name}</div>
								</TableCell>
								{isGlobalAdmin && (
									<TableCell className="text-right w-12 pr-4">
										<Button
											variant="ghost"
											size="icon"
											onClick={(e) => {
												e.stopPropagation();
												setSelectedInv(inv);
												setIsDeleteOpen(true);
											}}
										>
											<Trash2 className="w-4 h-4 text-destructive" />
										</Button>
									</TableCell>
								)}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="sm:max-w-md">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleCreate();
						}}
						className="space-y-4"
					>
						<DialogHeader>
							<DialogTitle>Buat Inventaris Baru</DialogTitle>
						</DialogHeader>
						<Input
							placeholder="Contoh: Lab Komputer 1, Inventaris Guru..."
							value={newName}
							className="mt-1"
							onChange={(e) => setNewName(e.target.value)}
							disabled={isPending}
						/>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" disabled={isPending}>
									Batal
								</Button>
							</DialogClose>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Membuat..." : "Buat Inventaris"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-destructive flex items-center gap-2">
							<ShieldAlert className="h-5 w-5" />
							Hapus Inventaris?
						</DialogTitle>
					</DialogHeader>
					<div className="py-2 text-sm space-y-2">
						<p>
							Apakah Anda yakin ingin menghapus inventaris{" "}
							<span className="font-bold text-foreground">
								&quot;{selectedInv?.name}&quot;
							</span>
							?
						</p>
						<p className="text-xs text-muted-foreground font-semibold">
							⚠️ Tindakan ini permanen dan akan menghapus seluruh data barang,
							riwayat transaksi stok, serta akses anggota di dalam inventaris
							ini.
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isPending}
						>
							{isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
