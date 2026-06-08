"use client";

import { useState } from "react";
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
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { createTimetableEntry, deleteTimetableEntry } from "../actions/timetable";

const DAYS = [
	"Minggu",
	"Senin",
	"Selasa",
	"Rabu",
	"Kamis",
	"Jumat",
	"Sabtu",
];

interface TimetableGridProps {
	initialTimetable: any[];
	lessons: any[];
	orgUnits: string[];
}

export function TimetableGrid({
	initialTimetable,
	lessons,
	orgUnits,
}: TimetableGridProps) {
	const [timetable, setTimetable] = useState(initialTimetable);
	const [selectedOrgUnit, setSelectedOrgUnit] = useState(orgUnits[0] || "");
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newEntry, setNewEntry] = useState({
		lessonId: "",
		dayOfWeek: "1",
		startTime: "08:00",
		endTime: "09:00",
	});

	const timeToMinutes = (time: string) => {
		const [h, m] = time.split(":").map(Number);
		return h * 60 + m;
	};

	const minutesToTime = (minutes: number) => {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
	};

	const handleAdd = async () => {
		try {
			const created = await createTimetableEntry({
				lessonId: parseInt(newEntry.lessonId),
				orgUnitPath: selectedOrgUnit,
				dayOfWeek: parseInt(newEntry.dayOfWeek),
				startTime: timeToMinutes(newEntry.startTime),
				endTime: timeToMinutes(newEntry.endTime),
			});
			const lesson = lessons.find((l) => l.id === parseInt(newEntry.lessonId));
			setTimetable([...timetable, { ...created, lessonName: lesson?.name }]);
			setIsAddOpen(false);
			toast.success("Jadwal berhasil ditambahkan");
		} catch (e) {
			toast.error("Gagal menambahkan jadwal");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Hapus jadwal ini?")) return;
		try {
			await deleteTimetableEntry(id);
			setTimetable(timetable.filter((t) => t.id !== id));
			toast.success("Jadwal berhasil dihapus");
		} catch (e) {
			toast.error("Gagal menghapus jadwal");
		}
	};

	const filteredTimetable = timetable.filter(
		(t) => t.orgUnitPath === selectedOrgUnit,
	);

	return (
		<div className="space-y-4">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div className="flex items-center gap-2 w-full md:w-auto">
					<span className="shrink-0 font-medium">Kelas:</span>
					<Select value={selectedOrgUnit} onValueChange={setSelectedOrgUnit}>
						<SelectTrigger className="w-full md:w-[200px]">
							<SelectValue placeholder="Pilih Kelas" />
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
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="w-4 h-4" /> Tambah Jadwal
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Tambah Jadwal Pelajaran</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<label>Mata Pelajaran</label>
								<Select
									value={newEntry.lessonId}
									onValueChange={(v) =>
										setNewEntry({ ...newEntry, lessonId: v })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Pilih Mata Pelajaran" />
									</SelectTrigger>
									<SelectContent>
										{lessons.map((lesson) => (
											<SelectItem key={lesson.id} value={lesson.id.toString()}>
												{lesson.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<label>Hari</label>
								<Select
									value={newEntry.dayOfWeek}
									onValueChange={(v) =>
										setNewEntry({ ...newEntry, dayOfWeek: v })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DAYS.map((day, i) => (
											<SelectItem key={i} value={i.toString()}>
												{day}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<label>Mulai</label>
									<Input
										type="time"
										value={newEntry.startTime}
										onChange={(e) =>
											setNewEntry({ ...newEntry, startTime: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<label>Selesai</label>
									<Input
										type="time"
										value={newEntry.endTime}
										onChange={(e) =>
											setNewEntry({ ...newEntry, endTime: e.target.value })
										}
									/>
								</div>
							</div>
							<Button onClick={handleAdd} className="w-full">
								Simpan
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>
			<div className="rounded-md border bg-card overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Hari</TableHead>
							<TableHead>Jam</TableHead>
							<TableHead>Mata Pelajaran</TableHead>
							<TableHead className="w-[80px]">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredTimetable
							.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime - b.startTime)
							.map((t) => (
								<TableRow key={t.id}>
									<TableCell>{DAYS[t.dayOfWeek]}</TableCell>
									<TableCell>
										{minutesToTime(t.startTime)} - {minutesToTime(t.endTime)}
									</TableCell>
									<TableCell className="font-medium">{t.lessonName}</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(t.id)}
											className="text-destructive"
										>
											<Trash className="w-4 h-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
