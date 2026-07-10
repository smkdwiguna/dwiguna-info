"use client";

import { Button } from "@/components/ui/button";
import { announcements } from "@/lib/db/announcement-schema";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AnnouncementFormDialog } from "./announcement-form-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAnnouncement } from "../actions/announcements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AnnouncementActionButtons({
	announcement,
}: {
	announcement: typeof announcements.$inferSelect;
}) {
	const router = useRouter();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDelete() {
		setIsDeleting(true);
		try {
			await deleteAnnouncement(announcement.id);
			toast.success("Pengumuman berhasil dihapus");
			setIsDeleteDialogOpen(false);
			router.push("/announcements");
			router.refresh();
		} catch (error) {
			console.error("Failed to delete announcement", error);
			toast.error("Gagal menghapus pengumuman");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsEditDialogOpen(true)}
			>
				<Pencil className="mr-2 h-4 w-4" />
				Ubah
			</Button>
			<Button
				variant="destructive"
				size="sm"
				onClick={() => setIsDeleteDialogOpen(true)}
			>
				<Trash2 className="mr-2 h-4 w-4" />
				Hapus
			</Button>

			<AnnouncementFormDialog
				announcement={announcement}
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
			>
				<span className="hidden"></span>
			</AnnouncementFormDialog>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
						<AlertDialogDescription>
							Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini
							tidak dapat dibatalkan.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDelete();
							}}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Menghapus..." : "Hapus"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
