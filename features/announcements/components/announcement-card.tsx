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
			<Card className="flex flex-col relative group hover:bg-accent hover:text-accent-foreground transition-colors">
				<CardHeader>
					<div className="flex max-md:flex-col items-start justify-between font-bold md:gap-4">
						<CardTitle className="line-clamp-2 text-lg grow">
							<Link
								href={`/announcements/${announcement.id}`}
								className="after:absolute after:inset-0 after:z-0"
							>
								{announcement.title}
							</Link>
						</CardTitle>
						<div className="text-sm text-muted-foreground w-fit items-center md:justify-end flex gap-1">
							<span suppressHydrationWarning>
								{authorName} •{" "}
								{new Date(announcement.createdAt).toLocaleDateString("id-ID", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</span>

							{canEdit && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="z-2" size="icon">
											<MoreHorizontal />
											<span className="sr-only">Menu aksi</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onSelect={() => setIsEditDialogOpen(true)}
										>
											<Pencil className="mr-2 h-4 w-4" />
											<span>Edit</span>
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
					</div>
				</CardHeader>
				<CardContent>
					<div
						className="prose prose-sm sm:prose-base pointer-events-none dark:prose-invert line-clamp-3 max-w-none text-muted-foreground"
						dangerouslySetInnerHTML={{
							__html: announcement.content,
						}}
					/>
				</CardContent>
			</Card>

			<AnnouncementFormDialog
				announcement={announcement}
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
			>
				<span className="hidden"></span>
			</AnnouncementFormDialog>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
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
		</>
	);
}
