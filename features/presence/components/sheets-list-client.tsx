"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
	createAttendanceSheet,
	deleteAttendanceSheet,
} from "../actions/sheets";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

export function SheetsListClient({ initialSheets }: { initialSheets: any[] }) {
	const [sheets, setSheets] = useState(initialSheets);
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	useEffect(() => {
		setSheets(initialSheets);
	}, [initialSheets]);

	// Form State
	const [name, setName] = useState("");

	const handleCreate = async () => {
		if (!name) return toast.error("Nama lembar harus diisi");

		setIsSubmitting(true);
		try {
			const result = await createAttendanceSheet(name);
			toast.success("Lembar berhasil dibuat!");
			setIsOpen(false);

			// Navigasi ke halaman detail sheet
			router.push(`/presence/${result.sheetId}`);
		} catch (error: any) {
			toast.error(`Gagal membuat lembar: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: number, sheetName: string) => {
		toast("Konfirmasi Hapus", {
			description: `Hapus lembar "${sheetName}"? Semua target dan jadwal terkait akan terhapus.`,
			action: {
				label: "Hapus",
				onClick: async () => {
					try {
						await deleteAttendanceSheet(id);
						setSheets(sheets.filter((s) => s.id !== id));
						toast.success("Lembar terhapus.");
					} catch (e) {
						toast.error(
							"Gagal menghapus lembar" +
								(e instanceof Error ? `: ${e.message}` : "."),
						);
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
					<PageHeaderTitle>Lembar Kehadiran</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button onClick={() => setIsOpen(true)}>
						<Plus className="w-4 h-4" />
						Buat Lembar Baru
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="rounded-md border bg-background">
				<Table>
					<TableBody>
						{sheets.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={3}
									className="text-center text-muted-foreground h-24"
								>
									Belum ada lembar kehadiran.
								</TableCell>
							</TableRow>
						) : (
							sheets.map((sheet) => (
								<TableRow
									key={sheet.id}
									className="cursor-pointer hover:bg-muted/50 transition-colors"
									onClick={() => router.push(`/presence/${sheet.id}`)}
								>
									<TableCell className="pl-4 font-bold">{sheet.name}</TableCell>
									<TableCell>{sheet.dateRange}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={(e) => {
												e.stopPropagation(); // Jangan pindah halaman kalau klik Hapus
												handleDelete(sheet.id, sheet.name);
											}}
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
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Buat Lembar Kehadiran Baru</DialogTitle>
					</DialogHeader>
					<div className="space-y-6 py-4">
						<div className="space-y-2">
							<Label>Nama Lembar</Label>
							<Input
								placeholder="Contoh: Presensi Ganjil 2026"
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
							{isSubmitting ? "Menyimpan..." : "Buat & Lanjut ke Pengaturan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
