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
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent className="min-w-[50vw] overflow-y-auto">
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isEditing ? "Edit Pengumuman" : "Buat Pengumuman"}
					</AlertDialogTitle>
				</AlertDialogHeader>
				<form onSubmit={handleSubmit} className="space-y-2">
					<div className="space-y-2">
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Contoh: Jadwal Libur Semester Ganjil"
							required
						/>
					</div>

					<div className="overflow-y-auto max-h-[50vh]">
						<AnnouncementEditor value={content} onChange={setContent} />
					</div>

					<AlertDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Menyimpan..." : "Simpan"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
