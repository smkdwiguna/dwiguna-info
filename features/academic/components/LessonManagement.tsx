"use client";

import { useState } from "react";
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
import { Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { createLesson, deleteLesson } from "../actions/lessons";

interface LessonManagementProps {
	initialLessons: any[];
}

export function LessonManagement({ initialLessons }: LessonManagementProps) {
	const [lessons, setLessons] = useState(initialLessons);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newLesson, setNewLesson] = useState({ name: "", type: "INTRACURRICULAR" });

	const handleAdd = async () => {
		try {
			const created = await createLesson(newLesson as any);
			setLessons([...lessons, created]);
			setIsAddOpen(false);
			setNewLesson({ name: "", type: "INTRACURRICULAR" });
			toast.success("Mata pelajaran berhasil ditambahkan");
		} catch (e) {
			toast.error("Gagal menambahkan mata pelajaran");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) return;
		try {
			await deleteLesson(id);
			setLessons(lessons.filter((l) => l.id !== id));
			toast.success("Mata pelajaran berhasil dihapus");
		} catch (e) {
			toast.error("Gagal menghapus mata pelajaran");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-bold">Daftar Mata Pelajaran & Kegiatan</h2>
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="w-4 h-4" /> Tambah
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Tambah Mata Pelajaran/Kegiatan</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<label>Nama</label>
								<Input
									value={newLesson.name}
									onChange={(e) =>
										setNewLesson({ ...newLesson, name: e.target.value })
									}
									placeholder="Contoh: Matematika"
								/>
							</div>
							<div className="space-y-2">
								<label>Tipe</label>
								<Select
									value={newLesson.type}
									onValueChange={(v) => setNewLesson({ ...newLesson, type: v })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="INTRACURRICULAR">Intrakurikuler</SelectItem>
										<SelectItem value="EXTRACURRICULAR">Ekstrakurikuler</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button onClick={handleAdd} className="w-full">
								Simpan
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			<div className="rounded-md border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nama</TableHead>
							<TableHead>Tipe</TableHead>
							<TableHead className="w-[100px]">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{lessons.map((lesson) => (
							<TableRow key={lesson.id}>
								<TableCell className="font-medium">{lesson.name}</TableCell>
								<TableCell>
									{lesson.type === "INTRACURRICULAR"
										? "Intrakurikuler"
										: "Ekstrakurikuler"}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(lesson.id)}
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
