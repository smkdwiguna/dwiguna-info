"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Trash2, Pencil, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	PageHeader,
	PageHeaderBack,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/components/ui/page-header";
import {
	findScheduleConflicts,
	isWindowValid,
	minutesToTime,
	resolveWindow,
	timeToMinutes,
	type PointScheduleLike,
	type ResolvedWindow,
} from "@/lib/presence-schedule";
import {
	bulkSetPointSchedules,
	removePointSchedule,
	savePointSchedule,
	type AgendaData,
	type AgendaScheduleRow,
} from "../actions/agenda";

function toDateKey(d: Date): string {
	const y = d.getFullYear();
	const m = (d.getMonth() + 1).toString().padStart(2, "0");
	const day = d.getDate().toString().padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function fromDateKey(key: string): Date {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(y, m - 1, d);
}

function formatDateId(key: string): string {
	return fromDateKey(key).toLocaleDateString("id-ID", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

export function AgendaClient({ data }: { data: AgendaData }) {
	const router = useRouter();

	const defaultsByPointId = useMemo(
		() =>
			new Map<number, ResolvedWindow>(
				data.points.map((p) => [
					p.id,
					{
						startTime: p.startTime,
						thresholdTime: p.thresholdTime,
						endTime: p.endTime,
					},
				]),
			),
		[data.points],
	);
	const pointById = useMemo(
		() => new Map(data.points.map((p) => [p.id, p])),
		[data.points],
	);
	const sheetNameById = useMemo(
		() => new Map(data.sheets.map((s) => [s.id, s.name])),
		[data.sheets],
	);
	const terminalNameById = useMemo(
		() => new Map(data.terminals.map((t) => [t.id, t.name])),
		[data.terminals],
	);

	const [pointId, setPointId] = useState<number | null>(
		data.points[0]?.id ?? null,
	);
	const [terminalId, setTerminalId] = useState<string | null>(
		data.terminals[0]?.id ?? null,
	);
	const [startStr, setStartStr] = useState("");
	const [thresholdStr, setThresholdStr] = useState("");
	const [endStr, setEndStr] = useState("");
	const [selectedDates, setSelectedDates] = useState<Date[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const selectedPoint = pointId != null ? pointById.get(pointId) : undefined;

	// When the chosen point changes, reset the time fields to its defaults.
	const [lastPointId, setLastPointId] = useState<number | null>(null);
	if (pointId !== lastPointId) {
		setLastPointId(pointId);
		if (selectedPoint) {
			setStartStr(minutesToTime(selectedPoint.startTime));
			setThresholdStr(minutesToTime(selectedPoint.thresholdTime));
			setEndStr(minutesToTime(selectedPoint.endTime));
		}
	}

	const candidateWindow: ResolvedWindow | null = useMemo(() => {
		if (!startStr || !thresholdStr || !endStr) return null;
		return {
			startTime: timeToMinutes(startStr),
			thresholdTime: timeToMinutes(thresholdStr),
			endTime: timeToMinutes(endStr),
		};
	}, [startStr, thresholdStr, endStr]);

	const windowValid = candidateWindow != null && isWindowValid(candidateWindow);

	const overlapsOnDate = (dateKey: string): boolean => {
		if (!selectedPoint || !terminalId || !candidateWindow) return false;
		const candidate: PointScheduleLike = {
			presencePointId: selectedPoint.id,
			terminalId,
			date: dateKey,
			startTime: candidateWindow.startTime,
			thresholdTime: candidateWindow.thresholdTime,
			endTime: candidateWindow.endTime,
		};
		// Exclude an existing instance of the SAME point here (that's a duplicate,
		// handled by bulk insert, not a conflict).
		const existing = data.schedules.filter(
			(s) =>
				!(
					s.presencePointId === candidate.presencePointId &&
					s.terminalId === candidate.terminalId &&
					s.date === dateKey
				),
		);
		return findScheduleConflicts(candidate, existing, defaultsByPointId).length > 0;
	};

	const isActiveOnDate = (dateKey: string): boolean =>
		!!selectedPoint &&
		!!terminalId &&
		data.schedules.some(
			(s) =>
				s.presencePointId === selectedPoint.id &&
				s.terminalId === terminalId &&
				s.date === dateKey,
		);

	const disabledMatcher = (date: Date): boolean => {
		if (!selectedPoint || !terminalId || !windowValid) return true;
		return overlapsOnDate(toDateKey(date));
	};

	const overrideForSend = () => {
		if (!selectedPoint || !candidateWindow) {
			return { startTime: null, thresholdTime: null, endTime: null };
		}
		const def = defaultsByPointId.get(selectedPoint.id)!;
		return {
			startTime:
				candidateWindow.startTime === def.startTime
					? null
					: candidateWindow.startTime,
			thresholdTime:
				candidateWindow.thresholdTime === def.thresholdTime
					? null
					: candidateWindow.thresholdTime,
			endTime:
				candidateWindow.endTime === def.endTime ? null : candidateWindow.endTime,
		};
	};

	const handleActivate = async () => {
		if (!selectedPoint || !terminalId) return;
		if (!windowValid) return toast.error("Rentang waktu tidak valid.");
		if (selectedDates.length === 0)
			return toast.error("Pilih minimal satu tanggal.");

		setIsSubmitting(true);
		try {
			const res = await bulkSetPointSchedules({
				presencePointId: selectedPoint.id,
				terminalId,
				dates: selectedDates.map(toDateKey),
				...overrideForSend(),
			});
			const skippedConflict = res.skipped.filter(
				(s) => s.reason === "bentrok",
			).length;
			const skippedDup = res.skipped.filter((s) => s.reason === "sudah ada")
				.length;
			let msg = `${res.added.length} tanggal diaktifkan.`;
			if (skippedDup) msg += ` ${skippedDup} sudah ada.`;
			if (skippedConflict) msg += ` ${skippedConflict} dilewati (bentrok).`;
			toast.success(msg);
			setSelectedDates([]);
			router.refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Gagal menyimpan jadwal.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: number) => {
		try {
			await removePointSchedule(id);
			toast.success("Jadwal dihapus.");
			router.refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
		}
	};

	// Listing: schedules for the chosen terminal (or all when none chosen).
	const listedSchedules = useMemo(() => {
		const rows = data.schedules.filter(
			(s) => !terminalId || s.terminalId === terminalId,
		);
		return rows.sort((a, b) => {
			if (a.date !== b.date) return a.date < b.date ? -1 : 1;
			const aw = resolveWindow(a, defaultsByPointId.get(a.presencePointId)!);
			const bw = resolveWindow(b, defaultsByPointId.get(b.presencePointId)!);
			return aw.startTime - bw.startTime;
		});
	}, [data.schedules, terminalId, defaultsByPointId]);

	const pointsBySheet = useMemo(() => {
		return data.sheets.map((sheet) => ({
			sheet,
			points: data.points.filter((p) => p.sheetId === sheet.id),
		}));
	}, [data.sheets, data.points]);

	const [editing, setEditing] = useState<AgendaScheduleRow | null>(null);

	const hasSetup = data.points.length > 0 && data.terminals.length > 0;

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderBack />
					<PageHeaderTitle>Agenda Jadwal</PageHeaderTitle>
				</PageHeaderHeading>
			</PageHeader>

			{!hasSetup ? (
				<div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
					Butuh minimal satu titik kehadiran dan satu perangkat untuk membuat
					jadwal. Tambahkan titik kehadiran di lembar dan daftarkan perangkat
					dulu.
				</div>
			) : (
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					{/* LEFT: selector + calendar */}
					<div className="space-y-4 rounded-md border bg-background p-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label>Titik Kehadiran</Label>
								<Select
									value={pointId != null ? String(pointId) : ""}
									onValueChange={(v) => setPointId(Number(v))}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Pilih titik..." />
									</SelectTrigger>
									<SelectContent>
										{pointsBySheet.map(({ sheet, points }) =>
											points.length > 0 ? (
												<SelectGroup key={sheet.id}>
													<SelectLabel>{sheet.name}</SelectLabel>
													{points.map((p) => (
														<SelectItem key={p.id} value={String(p.id)}>
															{p.name} ({minutesToTime(p.startTime)}–
															{minutesToTime(p.endTime)})
														</SelectItem>
													))}
												</SelectGroup>
											) : null,
										)}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label>Perangkat</Label>
								<Select
									value={terminalId ?? ""}
									onValueChange={(v) => setTerminalId(v)}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Pilih perangkat..." />
									</SelectTrigger>
									<SelectContent>
										{data.terminals.map((t) => (
											<SelectItem key={t.id} value={t.id}>
												{t.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">Mulai</Label>
								<Input
									type="time"
									value={startStr}
									onChange={(e) => setStartStr(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Terlambat</Label>
								<Input
									type="time"
									value={thresholdStr}
									onChange={(e) => setThresholdStr(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Tutup</Label>
								<Input
									type="time"
									value={endStr}
									onChange={(e) => setEndStr(e.target.value)}
								/>
							</div>
						</div>
						{!windowValid && (
							<p className="text-xs text-destructive">
								Rentang waktu tidak valid (mulai &lt; terlambat ≤ tutup).
							</p>
						)}

						<div className="flex justify-center rounded-md border p-2">
							<Calendar
								mode="multiple"
								selected={selectedDates}
								onSelect={(d) => setSelectedDates(d ?? [])}
								disabled={disabledMatcher}
								modifiers={{
									active: (date) => isActiveOnDate(toDateKey(date)),
								}}
								modifiersClassNames={{
									active:
										"[&>button]:ring-2 [&>button]:ring-emerald-500 [&>button]:ring-inset",
								}}
							/>
						</div>

						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<span className="h-3 w-3 rounded-full ring-2 ring-emerald-500 ring-inset" />
								Sudah aktif (titik+perangkat ini)
							</span>
							<span>Tanggal redup = bentrok / tak bisa dipilih</span>
						</div>

						<Button
							className="w-full"
							onClick={handleActivate}
							disabled={
								isSubmitting ||
								!windowValid ||
								selectedDates.length === 0 ||
								!terminalId
							}
						>
							<CalendarPlus className="h-4 w-4" />
							{isSubmitting
								? "Menyimpan..."
								: `Aktifkan (${selectedDates.length} tanggal)`}
						</Button>
					</div>

					{/* RIGHT: scheduled list */}
					<div className="space-y-3 rounded-md border bg-background p-4">
						<div className="flex items-center justify-between">
							<Label className="text-base font-semibold">
								Jadwal Terdaftar
							</Label>
							<span className="text-xs text-muted-foreground">
								{terminalId
									? terminalNameById.get(terminalId)
									: "Semua perangkat"}
							</span>
						</div>
						<div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
							{listedSchedules.length === 0 && (
								<div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
									Belum ada jadwal.
								</div>
							)}
							{listedSchedules.map((s) => {
								const point = pointById.get(s.presencePointId);
								const w = resolveWindow(
									s,
									defaultsByPointId.get(s.presencePointId)!,
								);
								const overridden =
									s.startTime != null ||
									s.thresholdTime != null ||
									s.endTime != null;
								return (
									<div
										key={s.id}
										className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="truncate font-medium">
													{point?.name ?? "Titik"}
												</span>
												{overridden && (
													<Badge variant="secondary">override</Badge>
												)}
											</div>
											<div className="text-xs text-muted-foreground">
												{formatDateId(s.date)} · {minutesToTime(w.startTime)}–
												{minutesToTime(w.endTime)}
												{point && (
													<>
														{" "}
														·{" "}
														{sheetNameById.get(point.sheetId) ?? ""}
													</>
												)}
											</div>
										</div>
										<div className="flex shrink-0 items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setEditing(s)}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDelete(s.id)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{editing && (
				<OverrideDialog
					row={editing}
					defaults={defaultsByPointId.get(editing.presencePointId)!}
					pointName={pointById.get(editing.presencePointId)?.name ?? "Titik"}
					onClose={() => setEditing(null)}
					onSaved={() => {
						setEditing(null);
						router.refresh();
					}}
				/>
			)}
		</>
	);
}

function OverrideDialog({
	row,
	defaults,
	pointName,
	onClose,
	onSaved,
}: {
	row: AgendaScheduleRow;
	defaults: ResolvedWindow;
	pointName: string;
	onClose: () => void;
	onSaved: () => void;
}) {
	const initial = resolveWindow(row, defaults);
	const [startStr, setStartStr] = useState(minutesToTime(initial.startTime));
	const [thresholdStr, setThresholdStr] = useState(
		minutesToTime(initial.thresholdTime),
	);
	const [endStr, setEndStr] = useState(minutesToTime(initial.endTime));
	const [saving, setSaving] = useState(false);

	const resetToDefault = () => {
		setStartStr(minutesToTime(defaults.startTime));
		setThresholdStr(minutesToTime(defaults.thresholdTime));
		setEndStr(minutesToTime(defaults.endTime));
	};

	const save = async () => {
		const window: ResolvedWindow = {
			startTime: timeToMinutes(startStr),
			thresholdTime: timeToMinutes(thresholdStr),
			endTime: timeToMinutes(endStr),
		};
		if (!isWindowValid(window)) {
			return toast.error("Rentang waktu tidak valid (mulai < terlambat ≤ tutup).");
		}
		setSaving(true);
		try {
			await savePointSchedule({
				id: row.id,
				presencePointId: row.presencePointId,
				terminalId: row.terminalId,
				date: row.date,
				startTime:
					window.startTime === defaults.startTime ? null : window.startTime,
				thresholdTime:
					window.thresholdTime === defaults.thresholdTime
						? null
						: window.thresholdTime,
				endTime: window.endTime === defaults.endTime ? null : window.endTime,
			});
			toast.success("Override disimpan.");
			onSaved();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Override waktu — {pointName} ({formatDateId(row.date)})
					</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-3 gap-2">
					<div className="space-y-1">
						<Label className="text-xs">Mulai</Label>
						<Input
							type="time"
							value={startStr}
							onChange={(e) => setStartStr(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Terlambat</Label>
						<Input
							type="time"
							value={thresholdStr}
							onChange={(e) => setThresholdStr(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Tutup</Label>
						<Input
							type="time"
							value={endStr}
							onChange={(e) => setEndStr(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter className="sm:justify-between">
					<Button variant="outline" onClick={resetToDefault}>
						<RotateCcw className="h-4 w-4" />
						Pakai default
					</Button>
					<Button onClick={save} disabled={saving}>
						{saving ? "Menyimpan..." : "Simpan"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
