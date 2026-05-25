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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import JSZip from "jszip";

export function BulkPhotoUploadClient() {
	const [isBulkPhotoOpen, setIsBulkPhotoOpen] = useState(false);
	const [bulkPhotos, setBulkPhotos] = useState<
		{ username: string; fileBase64: string; preview: string }[]
	>([]);
	const [isUploadingBulkPhotos, setIsUploadingBulkPhotos] = useState(false);

	const processImageToSquareBase64 = (
		file: File | Blob,
	): Promise<{ base64: string; preview: string }> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement("canvas");
					const size = Math.min(img.width, img.height);
					const startX = (img.width - size) / 2;
					const startY = (img.height - size) / 2;

					canvas.width = 2048;
					canvas.height = 2048;
					const ctx = canvas.getContext("2d");
					if (ctx) {
						// Center crop and resize
						ctx.drawImage(img, startX, startY, size, size, 0, 0, 256, 256);
						const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
						// Google wants web-safe base64: replace + with - and / with _
						const base64 = dataUrl
							.split(",")[1]
							.replace(/\+/g, "-")
							.replace(/\//g, "_");
						resolve({ base64, preview: dataUrl });
					} else {
						reject(new Error("Could not get canvas context"));
					}
				};
				img.onerror = () => reject(new Error("Failed to load image"));
				img.src = event.target?.result as string;
			};
			reader.onerror = () => reject(new Error("Failed to read file"));
			reader.readAsDataURL(file);
		});
	};

	const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const zip = new JSZip();
			const contents = await zip.loadAsync(file);
			const photos: {
				username: string;
				fileBase64: string;
				preview: string;
			}[] = [];

			for (const [filename, zipEntry] of Object.entries(contents.files)) {
				if (zipEntry.dir) continue;
				// Check if image
				if (!filename.match(/\.(jpg|jpeg|png|webp)$/i)) continue;

				const blob = await zipEntry.async("blob");
				const { base64, preview } = await processImageToSquareBase64(blob);

				// Extract username from filename
				// e.g., "johndoe.jpg" -> "johndoe"
				const username = filename.split("/").pop()?.split(".")[0] || "";
				if (username) {
					photos.push({
						username: username.toLowerCase(),
						fileBase64: base64,
						preview,
					});
				}
			}

			setBulkPhotos(photos);
			toast.success(`Ditemukan ${photos.length} foto valid.`);
		} catch (error) {
			console.error("Failed to parse zip", error);
			toast.error("Gagal membaca file ZIP.");
		}
	};

	const handleBulkUpload = async () => {
		if (bulkPhotos.length === 0) return;
		setIsUploadingBulkPhotos(true);

		try {
			const { bulkUpdatePhotos } =
				await import("../actions/bulk-update-photos");
			const updates = bulkPhotos.map((p) => ({
				userId: `${p.username}@smkdwiguna.sch.id`,
				base64Photo: p.fileBase64,
			}));

			const results = await bulkUpdatePhotos(updates);

			const successCount = results.filter((r) => r.status === "success").length;
			toast.success(
				`Berhasil memperbarui ${successCount} dari ${results.length} foto. Halaman akan dimuat ulang.`,
			);

			// Refresh page to sync photos in table and state
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			console.error("Bulk upload error", error);
			toast.error("Gagal mengunggah foto massal.");
		} finally {
			setIsUploadingBulkPhotos(false);
		}
	};

	return (
		<>
			<Button variant="outline" onClick={() => setIsBulkPhotoOpen(true)}>
				<Upload className="w-4 h-4" />
				Upload Foto
			</Button>

			<Dialog open={isBulkPhotoOpen} onOpenChange={setIsBulkPhotoOpen}>
				<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Upload Foto Massal (ZIP)</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="text-sm text-muted-foreground">
							<p className="mt-1">
								<strong>Penting:</strong> Nama file harus sama dengan username
								email pengguna sebelum tanda @. (Contoh: foto untuk{" "}
								<code className="text-xs bg-muted p-0.5 rounded">
									johndoe@smkdwiguna.sch.id
								</code>{" "}
								harus bernama{" "}
								<code className="text-xs bg-muted p-0.5 rounded">
									johndoe.jpg
								</code>{" "}
								atau{" "}
								<code className="text-xs bg-muted p-0.5 rounded">
									johndoe.png
								</code>
								)
							</p>
						</div>

						<div className="flex items-center justify-center w-full">
							<Label
								htmlFor="zip-upload"
								className="flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-8 w-full border-2 border-dashed border-muted-foreground/25 rounded-lg text-sm font-medium transition-colors justify-center"
							>
								<FileArchive className="w-6 h-6" />
								Pilih File ZIP
							</Label>
							<Input
								id="zip-upload"
								type="file"
								accept=".zip,application/zip"
								className="hidden"
								onChange={handleZipSelect}
							/>
						</div>

						{bulkPhotos.length > 0 && (
							<div className="mt-4">
								<p className="text-sm font-medium mb-2">
									Ditemukan {bulkPhotos.length} foto valid:
								</p>
								<div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
									{bulkPhotos.map((photo, i) => (
										<div key={i} className="flex flex-col items-center gap-1">
											<Avatar className="size-10">
												<AvatarImage src={photo.preview} />
												<AvatarFallback>?</AvatarFallback>
											</Avatar>
											<span
												className="text-[10px] truncate w-full text-center"
												title={photo.username}
											>
												{photo.username}
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsBulkPhotoOpen(false)}
							disabled={isUploadingBulkPhotos}
						>
							Batal
						</Button>
						<Button
							onClick={handleBulkUpload}
							disabled={bulkPhotos.length === 0 || isUploadingBulkPhotos}
						>
							{isUploadingBulkPhotos ? "Mengunggah..." : "Mulai Upload"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
