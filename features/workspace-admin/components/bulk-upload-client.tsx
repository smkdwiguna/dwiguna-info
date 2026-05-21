"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export interface StudentInput {
	fullName: string;
}

export interface GroupBlock {
	id: string;
	entryYear: string;
	className: string;
	students: StudentInput[];
}

export function BulkUploadClient() {
	const [blocks, setBlocks] = useState<GroupBlock[]>([
		{
			id: crypto.randomUUID(),
			entryYear: new Date().getFullYear().toString(),
			className: "",
			students: [],
		},
	]);
	const [isProcessing, setIsProcessing] = useState(false);

	const addBlock = () => {
		setBlocks([
			...blocks,
			{
				id: crypto.randomUUID(),
				entryYear: new Date().getFullYear().toString(),
				className: "",
				students: [],
			},
		]);
	};

	const removeBlock = (id: string) => {
		setBlocks(blocks.filter((b) => b.id !== id));
	};

	const updateBlock = (id: string, field: keyof GroupBlock, value: any) => {
		setBlocks(
			blocks.map((b) => {
				if (b.id === id) {
					return { ...b, [field]: value };
				}
				return b;
			})
		);
	};

	const handlePasteNames = (id: string, text: string) => {
		const names = text
			.split("\n")
			.map((n) => n.trim())
			.filter((n) => n.length > 0);
		
		const students = names.map((name) => ({ fullName: name }));
		updateBlock(id, "students", students);
	};

	const handleProcessBatch = async () => {
		setIsProcessing(true);
		try {
			// Here we will call the Server Action with `blocks`
			console.log("Processing batch:", blocks);
			await new Promise((resolve) => setTimeout(resolve, 2000));
			alert("Batch processed successfully!");
		} catch (error) {
			console.error(error);
			alert("Failed to process batch");
		} finally {
			setIsProcessing(false);
		}
	};

	const totalStudents = blocks.reduce((acc, block) => acc + block.students.length, 0);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Bulk Upload Pengguna</h1>
					<p className="text-muted-foreground">Tambah siswa baru dalam jumlah banyak berdasarkan kelas.</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={addBlock} variant="outline">
						<Plus className="mr-2 h-4 w-4" /> Tambah Kelas
					</Button>
					<Button onClick={handleProcessBatch} disabled={isProcessing || totalStudents === 0}>
						<Users className="mr-2 h-4 w-4" /> Proses {totalStudents} Siswa
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6">
				{blocks.map((block, index) => (
					<Card key={block.id}>
						<CardHeader className="flex flex-row items-start justify-between pb-4">
							<div className="space-y-1">
								<CardTitle>Kelas {index + 1}</CardTitle>
								<CardDescription>
									{block.students.length} siswa akan ditambahkan ke kelas ini
								</CardDescription>
							</div>
							{blocks.length > 1 && (
								<Button
									variant="ghost"
									size="icon"
									className="text-destructive"
									onClick={() => removeBlock(block.id)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								<div className="space-y-2">
									<Label>Tahun Masuk (Angkatan)</Label>
									<Input
										placeholder="e.g. 2024"
										value={block.entryYear}
										onChange={(e) => updateBlock(block.id, "entryYear", e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Nama Kelas</Label>
									<Input
										placeholder="e.g. 10-PPLG-1"
										value={block.className}
										onChange={(e) => updateBlock(block.id, "className", e.target.value)}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Daftar Nama Siswa (Paste dari Excel)</Label>
								<Textarea
									placeholder="Paste daftar nama dari Excel di sini (satu nama per baris)"
									className="min-h-[150px]"
									defaultValue={block.students.map((s) => s.fullName).join("\n")}
									onChange={(e) => handlePasteNames(block.id, e.target.value)}
								/>
							</div>

							{block.students.length > 0 && (
								<div className="mt-4 max-h-[200px] overflow-y-auto rounded-md border p-4 bg-muted/30">
									<ul className="list-decimal list-inside space-y-1 text-sm">
										{block.students.map((student, i) => (
											<li key={i}>{student.fullName}</li>
										))}
									</ul>
								</div>
							)}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
