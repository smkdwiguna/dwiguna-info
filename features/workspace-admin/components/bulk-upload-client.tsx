"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface UserInput {
	fullName: string;
}

export interface GroupBlock {
	id: string;
	orgUnitPath: string;
	users: UserInput[];
}

export function BulkUploadClient() {
	const [blocks, setBlocks] = useState<GroupBlock[]>([
		{
			id: crypto.randomUUID(),
			orgUnitPath: "",
			users: [],
		},
	]);
	const [isProcessing, setIsProcessing] = useState(false);

	const addBlock = () => {
		setBlocks([
			...blocks,
			{
				id: crypto.randomUUID(),
				orgUnitPath: "",
				users: [],
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
			}),
		);
	};

	const handlePasteNames = (id: string, text: string) => {
		const names = text
			.split("\n")
			.map((n) => n.trim())
			.filter((n) => n.length > 0);

		const users = names.map((name) => ({ fullName: name }));
		updateBlock(id, "users", users);
	};

	const handleProcessBatch = async () => {
		setIsProcessing(true);
		try {
			const { processBulkUpload } =
				await import("../actions/bulk-upload-actions");
			const response = await processBulkUpload(blocks);
			if (response.success) {
				console.log(response.results);
				toast.success(
					`Berhasil memproses batch! ${response.results.length} pengguna ditambahkan.`,
				);
			} else {
				toast.error("Gagal memproses batch.");
			}
		} catch (error) {
			console.error(error);
			toast.error("Terjadi kesalahan saat memproses batch.");
		} finally {
			setIsProcessing(false);
		}
	};

	const totalStudents = blocks.reduce(
		(acc, block) => acc + block.users.length,
		0,
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tambah Pengguna</h1>
				</div>
				<div className="flex gap-2">
					<Button onClick={addBlock} variant="outline">
						<Plus className="h-4 w-4" /> Tambah Blok Unit
					</Button>
					<Button
						onClick={handleProcessBatch}
						disabled={isProcessing || totalStudents === 0}
					>
						<Users className="h-4 w-4" /> Proses {totalStudents} Pengguna
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6">
				{blocks.map((block) => (
					<Card key={block.id}>
						<CardHeader className="flex flex-row items-start justify-between w-full">
							<div className="space-y-1 w-full">
								<CardTitle>
									<Input
										placeholder="contoh: /Siswa/2026/PPLG-1"
										value={block.orgUnitPath}
										onChange={(e) =>
											updateBlock(block.id, "orgUnitPath", e.target.value)
										}
									/>
								</CardTitle>
								<CardDescription>
									{block.users.length} pengguna akan ditambahkan ke unit ini
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
							<div className="space-y-2">
								<Label>Daftar Nama Pengguna (Per Baris)</Label>
								<Textarea
									placeholder="Paste daftar nama dari Excel di sini (satu nama per baris)"
									className="min-h-37.5"
									defaultValue={block.users.map((s) => s.fullName).join("\n")}
									onChange={(e) => handlePasteNames(block.id, e.target.value)}
								/>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
