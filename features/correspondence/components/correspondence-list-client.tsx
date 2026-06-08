"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPicker, type UserOption } from "@/components/user-picker";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { FileSignature, Globe, Lock, Plus, Upload } from "lucide-react";
import { createDocument } from "../actions/documents";
import type { DocumentSummary } from "../actions/documents";

export function CorrespondenceListClient({
	documents,
	canUpload,
	users = [],
	currentUser,
}: {
	documents: DocumentSummary[];
	canUpload: boolean;
	users?: UserOption[];
	currentUser?: { email: string; name: string };
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [title, setTitle] = useState("");
	const [isPublic, setIsPublic] = useState(false);
	const [signers, setSigners] = useState<string[]>([]);
	const fileRef = useRef<HTMLInputElement>(null);

	const sortedUsers = useMemo(() => {
		if (!currentUser) return users;
		const otherUsers = users.filter(
			(u) => u.email.toLowerCase() !== currentUser.email.toLowerCase(),
		);
		return [
			{
				email: currentUser.email,
				name: `${currentUser.name} (Anda)`,
			},
			...otherUsers,
		];
	}, [users, currentUser]);

	function handleSubmit() {
		const file = fileRef.current?.files?.[0];
		if (!title.trim()) {
			toast.error("Judul wajib diisi.");
			return;
		}
		if (!file) {
			toast.error("Pilih berkas PDF.");
			return;
		}
		const formData = new FormData();
		formData.set("title", title.trim());
		formData.set("isPublic", String(isPublic));
		formData.set("signers", JSON.stringify(signers));
		formData.set("file", file);

		startTransition(async () => {
			try {
				const id = await createDocument(formData);
				toast.success("Dokumen dibuat.");
				setOpen(false);
				setTitle("");
				setSigners([]);
				setIsPublic(false);
				router.push(`/correspondence/${id}`);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Gagal membuat dokumen.",
				);
			}
		});
	}

	return (
		<div className="space-y-4">
			<PageHeader>
				<PageHeaderHeading>
					<div>
						<PageHeaderTitle>Persuratan</PageHeaderTitle>
					</div>
				</PageHeaderHeading>
				{canUpload && (
					<PageHeaderActions>
						<Dialog open={open} onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button>
									<Plus className="mr-1 h-4 w-4" /> Dokumen Baru
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-lg">
								<DialogHeader>
									<DialogTitle>Unggah Dokumen</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="doc-title">Judul</Label>
										<Input
											id="doc-title"
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											placeholder="Surat Keterangan ..."
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="doc-file">Berkas PDF</Label>
										<Input
											id="doc-file"
											type="file"
											accept="application/pdf"
											ref={fileRef}
										/>
									</div>
									<div className="space-y-2">
										<Label>Undang penandatangan (opsional)</Label>
										<UserPicker
											users={sortedUsers}
											value={signers}
											onChange={setSigners}
											disabled={isPending}
											placeholder="Cari nama penandatangan..."
										/>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											id="doc-public"
											checked={isPublic}
											onCheckedChange={(v) => setIsPublic(v === true)}
										/>
										<Label htmlFor="doc-public" className="font-normal">
											Dokumen dapat dilihat publik
										</Label>
									</div>
								</div>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setOpen(false)}
										disabled={isPending}
									>
										Batal
									</Button>
									<Button onClick={handleSubmit} disabled={isPending}>
										<Upload className="mr-1 h-4 w-4" />
										{isPending ? "Mengunggah..." : "Unggah"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</PageHeaderActions>
				)}
			</PageHeader>

			{documents.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
						<FileSignature className="h-10 w-10" />
						<p>Belum ada dokumen.</p>
						{!canUpload && (
							<p className="text-xs">
								Anda akan melihat dokumen di sini ketika diundang
								menandatangani.
							</p>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{documents.map((doc) => (
						<Link key={doc.id} href={`/correspondence/${doc.id}`}>
							<Card className="transition hover:border-primary/50">
								<CardContent className="flex gap-2 items-center justify-between">
									<div className="flex items-start gap-3">
										<div>
											<p className="font-bold">{doc.title}</p>
											<p className="text-xs text-muted-foreground">
												{doc.ownerName}
												{doc.isOwner ? " (Anda)" : ""}
											</p>
										</div>
									</div>
									<div className="flex flex-col items-end">
										<span className="text-sm font-bold text-muted-foreground">
											{doc.signedCount}/{doc.signerCount} tanda tangan
										</span>
										<span className="text-sm flex items-center gap-1 text-muted-foreground">
											{doc.isPublic ? (
												<Globe className="h-3 w-3" />
											) : (
												<Lock className="h-3 w-3" />
											)}
											{doc.isPublic ? "Publik" : "Privat"}
										</span>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
