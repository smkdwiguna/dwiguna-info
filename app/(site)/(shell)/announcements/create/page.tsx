"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnnouncementEditor } from "@/features/announcements/components/announcement-editor";
import { createAnnouncement } from "@/features/announcements/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageHeaderHeading, PageHeaderTitle } from "@/components/ui/page-header";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreateAnnouncementPage() {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

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
			await createAnnouncement(title, content);
			toast.success("Pengumuman berhasil dibuat");
			router.push("/announcements");
			router.refresh();
		} catch (error) {
			console.error("Failed to create announcement", error);
			toast.error("Gagal membuat pengumuman, periksa akses Anda");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			<Link href="/announcements">
				<Button variant="ghost" className="mb-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Batal
				</Button>
			</Link>

			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Buat Pengumuman Baru</PageHeaderTitle>
				</PageHeaderHeading>
			</PageHeader>

			<Card>
				<CardContent className="pt-6">
					<form onSubmit={handleSubmit} className="space-y-6">
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
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Menyimpan..." : "Terbitkan Pengumuman"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
