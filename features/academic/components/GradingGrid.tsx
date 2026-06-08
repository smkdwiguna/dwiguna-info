"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Plus, Download, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
	getOrCreateGradingSheet,
	getGradingSheetDataFixed,
	addGradingColumn,
	updateScore,
	deleteGradingColumn,
} from "../actions/grading";

interface GradingGridProps {
	lessons: any[];
	allOrgUnits: string[];
	studentsByOrgUnit: Record<string, any[]>;
}

export function GradingGrid({
	lessons,
	allOrgUnits,
	studentsByOrgUnit,
}: GradingGridProps) {
	const [selectedLessonId, setSelectedLessonId] = useState(
		lessons[0]?.id.toString() || "",
	);
	const [selectedOrgUnit, setSelectedOrgUnit] = useState(allOrgUnits[0] || "");
	const [sheet, setSheet] = useState<any>(null);
	const [columns, setColumns] = useState<any[]>([]);
	const [scores, setScores] = useState<any[]>([]);
	const [newColumnName, setNewColumnName] = useState("");

	const currentStudents = useMemo(
		() => studentsByOrgUnit[selectedOrgUnit] || [],
		[selectedOrgUnit, studentsByOrgUnit],
	);

	useEffect(() => {
		if (selectedLessonId && selectedOrgUnit) {
			loadSheetData();
		}
	}, [selectedLessonId, selectedOrgUnit]);

	const loadSheetData = async () => {
		try {
			const s = await getOrCreateGradingSheet(
				parseInt(selectedLessonId),
				selectedOrgUnit,
			);
			setSheet(s);
			const { columns: c, scores: sc } = await getGradingSheetDataFixed(s.id);
			setColumns(c);
			setScores(sc);
		} catch (e) {
			toast.error("Gagal memuat data penilaian");
		}
	};

	const handleAddColumn = async () => {
		if (!newColumnName || !sheet) return;
		try {
			const created = await addGradingColumn(sheet.id, newColumnName);
			setColumns([...columns, created]);
			setNewColumnName("");
			toast.success("Kolom berhasil ditambah");
		} catch (e) {
			toast.error("Gagal menambah kolom");
		}
	};

	const handleDeleteColumn = async (id: number) => {
		if (!confirm("Hapus kolom ini dan semua nilainya?")) return;
		try {
			await deleteGradingColumn(id);
			setColumns(columns.filter((c) => c.id !== id));
			toast.success("Kolom berhasil dihapus");
		} catch (e) {
			toast.error("Gagal menghapus kolom");
		}
	};

	const handleScoreChange = async (
		columnId: number,
		studentEmail: string,
		value: string,
	) => {
		const score = parseFloat(value) || 0;
		const newScores = [...scores];
		const idx = newScores.findIndex(
			(s) => s.columnId === columnId && s.studentEmail === studentEmail,
		);
		if (idx > -1) {
			newScores[idx].score = score;
		} else {
			newScores.push({ columnId, studentEmail, score });
		}
		setScores(newScores);

		try {
			await updateScore(columnId, studentEmail, score);
		} catch (e) {
			toast.error("Gagal menyimpan nilai");
		}
	};

	const getScore = (columnId: number, studentEmail: string) => {
		return (
			scores.find(
				(s) => s.columnId === columnId && s.studentEmail === studentEmail,
			)?.score || ""
		);
	};

	const handleExport = () => {
		const data = currentStudents.map((student) => {
			const row: any = {
				Nama: student.name?.fullName || student.primaryEmail,
				Email: student.primaryEmail,
			};
			columns.forEach((col) => {
				row[col.name] = getScore(col.id, student.primaryEmail);
			});
			return row;
		});

		const ws = XLSX.utils.json_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Penilaian");
		XLSX.writeFile(
			wb,
			`Penilaian_${selectedOrgUnit.replace(/\//g, "-")}_${selectedLessonId}.xlsx`,
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border">
				<div className="flex-1 space-y-1">
					<label className="text-sm font-medium">Mata Pelajaran</label>
					<div className="flex flex-wrap gap-2">
						{lessons.map((lesson) => (
							<Button
								key={lesson.id}
								variant={selectedLessonId === lesson.id.toString() ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedLessonId(lesson.id.toString())}
							>
								{lesson.name}
							</Button>
						))}
					</div>
				</div>
			</div>
			<div className="flex flex-wrap gap-1 border-b pb-px">
				{allOrgUnits.map((ou) => (
					<button
						key={ou}
						onClick={() => setSelectedOrgUnit(ou)}
						className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
							selectedOrgUnit === ou
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground"
						}`}
					>
						{ou.split("/").pop() || "/"}
					</button>
				))}
			</div>
			<div className="flex justify-between items-center">
				<div className="flex items-center gap-2">
					<Input
						placeholder="Nama kolom baru..."
						value={newColumnName}
						onChange={(e) => setNewColumnName(e.target.value)}
						className="w-[200px]"
					/>
					<Button size="icon" onClick={handleAddColumn}>
						<Plus className="w-4 h-4" />
					</Button>
				</div>
				<Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
					<Download className="w-4 h-4" /> Export
				</Button>
			</div>
			<div className="rounded-md border bg-card overflow-auto max-h-[600px]">
				<Table>
					<TableHeader className="sticky top-0 bg-card z-10">
						<TableRow>
							<TableHead className="w-[250px]">Nama Siswa</TableHead>
							{columns.map((col) => (
								<TableHead key={col.id} className="min-w-[100px] group relative">
									<div className="flex items-center justify-between gap-2">
										<span>{col.name}</span>
										<button
											onClick={() => handleDeleteColumn(col.id)}
											className="opacity-0 group-hover:opacity-100 text-destructive"
										>
											<X className="w-3 h-3" />
										</button>
									</div>
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{currentStudents.map((student) => (
							<TableRow key={student.primaryEmail}>
								<TableCell className="font-medium">
									<div className="flex flex-col">
										<span>{student.name?.fullName || student.primaryEmail}</span>
										<span className="text-[10px] text-muted-foreground">
											{student.primaryEmail}
										</span>
									</div>
								</TableCell>
								{columns.map((col) => (
									<TableCell key={col.id} className="p-0">
										<input
											type="number"
											className="w-full h-10 px-3 bg-transparent border-none focus:ring-2 focus:ring-primary text-center"
											value={getScore(col.id, student.primaryEmail)}
											onChange={(e) =>
												handleScoreChange(col.id, student.primaryEmail, e.target.value)
											}
											placeholder="-"
										/>
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
