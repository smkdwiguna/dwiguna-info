"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnnouncementEditor } from "./announcement-editor";
import {
	createAnnouncement,
	updateAnnouncement,
} from "../actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

interface Announcement {
	id: number;
	title: string;
	content: string;
}

interface AnnouncementFormDialogProps {
	announcement?: Announcement;
	children: React.ReactNode;
	onSuccess?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function AnnouncementFormDialog({
	announcement,
	children,
	onSuccess,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: AnnouncementFormDialogProps) {
	const router = useRouter();
	const [internalOpen, setInternalOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isEditing = !!announcement;
	const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

	const setOpen = (newOpen: boolean) => {
		if (controlledOpen !== undefined && setControlledOpen) {
			setControlledOpen(newOpen);
		} else {
			setInternalOpen(newOpen);
		}
	};

	useEffect(() => {
		if (open) {
			if (isEditing) {
				setTitle(announcement.title);
				setContent(announcement.content);
			} else {
				setTitle("");
				setContent("");
			}
		}
	}, [open, announcement, isEditing]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim()) {
			toast.error("Judul tidak boleh kosong");
			return;
		}
		if (!content.trim() || content === "<p></p>") {
			toast.error("Konten tidak boleh kosong");
			return;
		}

		setIsSubmitting(true);
		try {
			if (isEditing) {
				await updateAnnouncement(announcement.id, title, content);
				toast.success("Pengumuman berhasil diubah");
			} else {
				await createAnnouncement(title, content);
				toast.success("Pengumuman berhasil dibuat");
			}
			setOpen(false);
			if (onSuccess) {
				onSuccess();
			}
			router.refresh();
		} catch (error) {
			console.error("Failed to save announcement", error);
			toast.error("Gagal menyimpan pengumuman, periksa akses Anda");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Ubah Pengumuman" : "Buat Pengumuman Baru"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-6 py-4">
					<div className="space-y-2">
						<Label htmlFor="title">Judul Pengumuman</Label>
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Contoh: Jadwal Libur Semester Ganjil"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="content">Isi Pengumuman</Label>
						<AnnouncementEditor value={content} onChange={setContent} />
					</div>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Menyimpan..." : "Simpan Pengumuman"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
