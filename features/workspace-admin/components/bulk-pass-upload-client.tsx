"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileArchive, Upload } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

type UploadSide = "front" | "back";

export function BulkPassUploadClient() {
	const [isOpen, setIsOpen] = useState(false);
	const [frontZip, setFrontZip] = useState<File | null>(null);
	const [backZip, setBackZip] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [draggingSide, setDraggingSide] = useState<UploadSide | null>(null);

	const getZipSetter = (side: UploadSide) => {
		return side === "front" ? setFrontZip : setBackZip;
	};

	const handleZipPick = (side: UploadSide, file?: File | null) => {
		getZipSetter(side)(file ?? null);
	};

	const handleZipDrop = (
		side: UploadSide,
		event: React.DragEvent<HTMLLabelElement>,
	) => {
		event.preventDefault();
		event.stopPropagation();
		setDraggingSide(null);
		const file = event.dataTransfer.files?.[0];
		if (file) handleZipPick(side, file);
	};

	const renderZipPicker = (
		side: UploadSide,
		label: string,
		selectedFile: File | null,
		inputId: string,
	) => {
		const isDragging = draggingSide === side;
		return (
			<div className="space-y-2">
				<Label htmlFor={inputId}>{label}</Label>
				<Label
					htmlFor={inputId}
					onDragEnter={() => setDraggingSide(side)}
					onDragOver={(event) => {
						event.preventDefault();
						setDraggingSide(side);
					}}
					onDragLeave={() => {
						if (draggingSide === side) setDraggingSide(null);
					}}
					onDrop={(event) => handleZipDrop(side, event)}
					className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm font-medium transition-colors ${
						isDragging
							? "border-primary bg-primary/10 text-primary"
							: "border-muted-foreground/25 bg-secondary text-secondary-foreground hover:bg-secondary/80"
					}`}
				>
					<FileArchive className="h-5 w-5" />
					<span>
						{selectedFile ? selectedFile.name : "Tarik ZIP ke sini atau klik untuk memilih"}
					</span>
					<span className="text-xs font-normal text-muted-foreground">
						{side === "front" ? "Sisi depan" : "Sisi belakang"}
					</span>
				</Label>
				<Input
					id={inputId}
					type="file"
					accept=".zip,application/zip"
					className="hidden"
					onChange={(event) => handleZipPick(side, event.target.files?.[0] ?? null)}
				/>
			</div>
		);
	};

	const submitUpload = async () => {
		if (!frontZip && !backZip) return;
		setIsUploading(true);

		try {
			// Client-side validation: ensure selected files are readable ZIPs
			if (frontZip) {
				try {
					await new JSZip().loadAsync(frontZip);
				} catch (err) {
					throw new Error("ZIP Depan tidak valid atau rusak.");
				}
			}
			if (backZip) {
				try {
					await new JSZip().loadAsync(backZip);
				} catch (err) {
					throw new Error("ZIP Belakang tidak valid atau rusak.");
				}
			}

			const formData = new FormData();
			if (frontZip) formData.set("frontZip", frontZip);
			if (backZip) formData.set("backZip", backZip);

			const response = await fetch("/api/account-passes/bulk", {
				method: "POST",
				body: formData,
			});

			const result = (await response.json()) as {
				success: boolean;
				message?: string;
				summaries?: { side: string; matched: number; missingUsers: string[] }[];
			};

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Gagal mengunggah kartu massal.");
			}

			const totalMatched =
				result.summaries?.reduce((sum, item) => sum + item.matched, 0) ?? 0;
			toast.success(`Berhasil memproses ${totalMatched} file kartu.`);
			setIsOpen(false);
			setFrontZip(null);
			setBackZip(null);
			window.location.reload();
		} catch (error) {
			console.error("Bulk kartu upload error", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Gagal mengunggah kartu massal.",
			);
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<>
			<Button variant="outline" onClick={() => setIsOpen(true)}>
				<Upload className="w-4 h-4" />
				Upload Kartu
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Upload Kartu Massal (ZIP)</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="text-sm text-muted-foreground">
							<p>
								Nama file di dalam ZIP harus sama dengan username sebelum tanda{" "}
								<code className="text-xs bg-muted p-0.5 rounded">@</code>.
								Contoh:{" "}
								<code className="text-xs bg-muted p-0.5 rounded">
									johndoe.jpg
								</code>{" "}
								untuk{" "}
								<code className="text-xs bg-muted p-0.5 rounded">
									johndoe@smkdwiguna.sch.id
								</code>
								.
							</p>
						</div>

						{renderZipPicker("front", "ZIP Depan", frontZip, "front-zip")}

						{renderZipPicker("back", "ZIP Belakang", backZip, "back-zip")}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsOpen(false)}
							disabled={isUploading}
						>
							Batal
						</Button>
						<Button
							onClick={submitUpload}
							disabled={(!frontZip && !backZip) || isUploading}
						>
							{isUploading ? "Mengunggah..." : "Mulai Upload"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
