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
import { assignTeacher, removeTeacherAssignment } from "../actions/assignments";

interface TeacherAssignmentProps {
	initialAssignments: any[];
	lessons: any[];
	orgUnits: string[];
}

export function TeacherAssignment({
	initialAssignments,
	lessons,
	orgUnits,
}: TeacherAssignmentProps) {
	const [assignments, setAssignments] = useState(initialAssignments);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newAssignment, setNewAssignment] = useState({
		teacherEmail: "",
		lessonId: "",
		orgUnitPath: "",
	});

	const handleAdd = async () => {
		if (
			!newAssignment.teacherEmail ||
			!newAssignment.lessonId ||
			!newAssignment.orgUnitPath
		) {
			toast.error("Semua field harus diisi");
			return;
		}
		try {
			const created = await assignTeacher({
				...newAssignment,
				lessonId: parseInt(newAssignment.lessonId),
			});
			const lesson = lessons.find((l) => l.id === parseInt(newAssignment.lessonId));
			setAssignments([
				...assignments,
				{ ...created, lessonName: lesson?.name || "Unknown" },
			]);
			setIsAddOpen(false);
			setNewAssignment({ teacherEmail: "", lessonId: "", orgUnitPath: "" });
			toast.success("Penugasan guru berhasil ditambahkan");
		} catch (e) {
			toast.error("Gagal menambahkan penugasan guru");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Apakah Anda yakin ingin menghapus penugasan ini?")) return;
		try {
			await removeTeacherAssignment(id);
			setAssignments(assignments.filter((a) => a.id !== id));
			toast.success("Penugasan guru berhasil dihapus");
		} catch (e) {
			toast.error("Gagal menghapus penugasan guru");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-bold">Penugasan Guru</h2>
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="w-4 h-4" /> Tambah
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Tambah Penugasan Guru</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<label>Email Guru</label>
								<Input
									value={newAssignment.teacherEmail}
									onChange={(e) =>
										setNewAssignment({
											...newAssignment,
											teacherEmail: e.target.value,
										})
									}
									placeholder="guru@example.com"
								/>
							</div>
							<div className="space-y-2">
								<label>Mata Pelajaran</label>
								<Select
									value={newAssignment.lessonId}
									onValueChange={(v) =>
										setNewAssignment({ ...newAssignment, lessonId: v })
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
								<label>Unit Organisasi (Kelas)</label>
								<Select
									value={newAssignment.orgUnitPath}
									onValueChange={(v) =>
										setNewAssignment({ ...newAssignment, orgUnitPath: v })
									}
								>
									<SelectTrigger>
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
							<TableHead>Email Guru</TableHead>
							<TableHead>Mata Pelajaran</TableHead>
							<TableHead>Kelas</TableHead>
							<TableHead className="w-[100px]">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{assignments.map((a) => (
							<TableRow key={a.id}>
								<TableCell>{a.teacherEmail}</TableCell>
								<TableCell>{a.lessonName}</TableCell>
								<TableCell>{a.orgUnitPath}</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(a.id)}
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
