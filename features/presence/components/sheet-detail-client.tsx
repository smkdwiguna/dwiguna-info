"use client";

import { useState } from "react";
import { Plus, Trash2, Save, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateAttendanceSheet } from "../actions/update-sheet";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderBack,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";

interface Sheet {
	id: number;
	name: string;
}

interface Target {
	id?: number;
	orgUnitPath: string;
	alias: string;
}

interface Point {
	id?: number;
	name: string;
	startTime: number | string;
	thresholdTime: number | string;
	endTime: number | string;
}

export function SheetDetailClient({
	sheet,
	targets: initialTargets,
	points: initialPoints,
	orgUnits,
}: {
	sheet: Sheet;
	targets: Target[];
	points: Point[];
	orgUnits: string[];
}) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [name, setName] = useState(sheet.name);

	const [targets, setTargets] = useState<Target[]>(
		initialTargets.length > 0
			? initialTargets
			: [{ orgUnitPath: "", alias: "" }],
	);

	const minutesToTime = (minutes: number) => {
		const h = Math.floor(minutes / 60)
			.toString()
			.padStart(2, "0");
		const m = (minutes % 60).toString().padStart(2, "0");
		return `${h}:${m}`;
	};

	const timeToMinutes = (timeStr: string) => {
		const [hours, minutes] = timeStr.split(":").map(Number);
		return hours * 60 + minutes;
	};

	const [points, setPoints] = useState<Point[]>(
		initialPoints.length > 0
			? initialPoints.map((p) => ({
					...p,
					startTime: minutesToTime(p.startTime as number),
					thresholdTime: minutesToTime(p.thresholdTime as number),
					endTime: minutesToTime(p.endTime as number),
				}))
			: [
					{
						name: "Masuk",
						startTime: "06:00",
						thresholdTime: "07:00",
						endTime: "12:00",
					},
				],
	);

	const handleSave = async () => {
		if (!name) return toast.error("Nama lembar harus diisi");

		setIsSubmitting(true);
		try {
			const payload = {
				sheetId: sheet.id,
				name,
				targets: targets.filter((t) => t.orgUnitPath),
				points: points
					.filter((p) => p.name)
					.map((p) => ({
						id: p.id,
						name: p.name,
						startTime: timeToMinutes(p.startTime as string),
						thresholdTime: timeToMinutes(p.thresholdTime as string),
						endTime: timeToMinutes(p.endTime as string),
					})),
			};

			await updateAttendanceSheet(payload);
			toast.success("Pengaturan lembar berhasil disimpan!");
			router.refresh();
		} catch (error) {
			toast.error(
				`Gagal menyimpan${error instanceof Error && ": " + error.message}.`,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderBack />
					<PageHeaderTitle>
						<Input
							placeholder="Contoh: Presensi Ganjil 2026"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="text-2xl! h-12 font-bold"
						/>
					</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button onClick={handleSave} disabled={isSubmitting}>
						<Save className="w-4 h-4" />
						{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
					</Button>
				</PageHeaderActions>
			</PageHeader>
			<div className="bg-background rounded-md border p-6 space-y-8">
				{/* TARGETS */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-lg font-semibold">Unit Target</Label>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setTargets([...targets, { orgUnitPath: "", alias: "" }])
							}
						>
							<Plus className="w-4 h-4 mr-2" /> Tambah Unit
						</Button>
					</div>
					<div className="space-y-2">
						{targets.map((t, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<Select
									value={t.orgUnitPath}
									onValueChange={(value) => {
										const newT = [...targets];
										newT[idx].orgUnitPath = value;
										setTargets(newT);
									}}
								>
									<SelectTrigger className="flex-1">
										<SelectValue placeholder="Pilih Unit..." />
									</SelectTrigger>
									<SelectContent>
										{orgUnits.map((ou) => (
											<SelectItem key={ou} value={ou}>
												{ou}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									placeholder="Alias (opsional, misal: 10 PPLG 1"
									value={t.alias}
									onChange={(e) => {
										const newT = [...targets];
										newT[idx].alias = e.target.value;
										setTargets(newT);
									}}
									className="flex-1"
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() =>
										setTargets(targets.filter((_, i) => i !== idx))
									}
								>
									<Trash2 className="w-4 h-4 text-destructive" />
								</Button>
							</div>
						))}
						{targets.length === 0 && (
							<div className="p-4 text-center border border-dashed rounded-md text-muted-foreground text-sm">
								Belum ada unit target.
							</div>
						)}
					</div>
				</div>

				{/* PRESENCE POINTS */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-lg font-semibold">Titik Kehadiran</Label>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setPoints([
									...points,
									{
										name: "",
										startTime: "00:00",
										thresholdTime: "00:00",
										endTime: "00:00",
									},
								])
							}
						>
							<Plus className="w-4 h-4 mr-2" /> Tambah Titik
						</Button>
					</div>
					<div className="space-y-2">
						{points.map((p, idx) => (
							<div
								key={idx}
								className="flex gap-2 items-center border p-4 rounded-md bg-muted/30"
							>
								<div className="md:grid grid-cols-4 gap-4 max-md:space-y-4 flex-1">
									<div className="space-y-1">
										<Label className="text-xs">Nama Titik</Label>
										<Input
											placeholder="Contoh: Masuk"
											value={p.name}
											onChange={(e) => {
												const n = [...points];
												n[idx].name = e.target.value;
												setPoints(n);
											}}
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Mulai</Label>
										<Input
											type="time"
											value={p.startTime as string}
											onChange={(e) => {
												const n = [...points];
												n[idx].startTime = e.target.value;
												setPoints(n);
											}}
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Terlambat</Label>
										<Input
											type="time"
											value={p.thresholdTime as string}
											onChange={(e) => {
												const n = [...points];
												n[idx].thresholdTime = e.target.value;
												setPoints(n);
											}}
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Tutup</Label>
										<Input
											type="time"
											value={p.endTime as string}
											onChange={(e) => {
												const n = [...points];
												n[idx].endTime = e.target.value;
												setPoints(n);
											}}
										/>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setPoints(points.filter((_, i) => i !== idx))}
								>
									<Trash2 className="w-4 h-4 text-destructive" />
								</Button>
							</div>
						))}
						{points.length === 0 && (
							<div className="p-4 text-center border border-dashed rounded-md text-muted-foreground text-sm">
								Belum ada titik kehadiran.
							</div>
						)}
					</div>
				</div>

				{/* SCHEDULING (moved to global agenda) */}
				<div className="space-y-3">
					<Label className="text-lg font-semibold">Jadwal Aktif</Label>
					<Link
						href="/presence/agenda"
						className="flex items-center justify-between gap-3 rounded-md border p-4 transition-colors hover:bg-muted"
					>
						<div className="flex items-center gap-3">
							<CalendarDays className="w-5 h-5 text-muted-foreground" />
							<div className="text-sm">
								<p className="font-medium">Atur tanggal aktif di Agenda</p>
								<p className="text-muted-foreground">
									Pilih tanggal & perangkat per titik kehadiran lewat kalender
									global (termasuk override waktu per hari).
								</p>
							</div>
						</div>
						<ArrowRight className="w-4 h-4 text-muted-foreground" />
					</Link>
				</div>
			</div>
		</PageShell>
	);
}
