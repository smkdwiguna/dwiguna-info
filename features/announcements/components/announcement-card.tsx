"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { announcements } from "@/lib/db/announcement-schema";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnnouncementFormDialog } from "./announcement-form-dialog";
import { useState } from "react";
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

export function AnnouncementCard({
	announcement,
	authorName,
	canEdit,
}: {
	announcement: typeof announcements.$inferSelect;
	authorName: string;
	canEdit: boolean;
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
			router.refresh();
		} catch (error) {
			console.error("Failed to delete announcement", error);
			toast.error("Gagal menghapus pengumuman");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<>
			<Card className="flex flex-col relative group">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<CardTitle className="line-clamp-2 text-lg font-bold flex-grow">
							<Link
								href={`/announcements/${announcement.id}`}
								className="hover:underline"
							>
								{announcement.title}
							</Link>
						</CardTitle>
						{canEdit && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="-mt-2 -mr-2">
										<MoreHorizontal className="h-4 w-4" />
										<span className="sr-only">Menu aksi</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
										<Pencil className="mr-2 h-4 w-4" />
										<span>Ubah</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive focus:bg-destructive/10 focus:text-destructive"
										onSelect={() => setIsDeleteDialogOpen(true)}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										<span>Hapus</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
					<div className="text-sm text-muted-foreground font-normal flex flex-wrap gap-1 mt-2">
						<span>{authorName}</span>
						<span>•</span>
						<span>
							{new Date(announcement.createdAt).toLocaleDateString("id-ID", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<Link href={`/announcements/${announcement.id}`} className="block">
						<div
							className="prose prose-sm sm:prose-base dark:prose-invert line-clamp-3 max-w-none text-muted-foreground"
							dangerouslySetInnerHTML={{
								__html: announcement.content,
							}}
						/>
					</Link>
				</CardContent>
			</Card>

			<AnnouncementFormDialog
				announcement={announcement}
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
			>
				{/* The dialog trigger is hidden here since we open it via controlled state */}
				<span className="hidden"></span>
			</AnnouncementFormDialog>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
						<AlertDialogDescription>
							Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak
							dapat dibatalkan.
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
		</>
	);
}
