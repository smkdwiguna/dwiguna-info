"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { FileSignature, Globe, Lock, Plus, Upload } from "lucide-react";
import { createDocument } from "../actions/documents";
import type { DocumentSummary } from "../actions/documents";

const STATUS_LABELS: Record<string, string> = {
	DRAFT: "Draf",
	PARTIAL: "Sebagian",
	COMPLETED: "Selesai",
};

export function PersuratanListClient({
	documents,
	canUpload,
}: {
	documents: DocumentSummary[];
	canUpload: boolean;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [title, setTitle] = useState("");
	const [isPublic, setIsPublic] = useState(false);
	const [signers, setSigners] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

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
		const emails = signers
			.split(/[\s,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		const formData = new FormData();
		formData.set("title", title.trim());
		formData.set("isPublic", String(isPublic));
		formData.set("signers", JSON.stringify(emails));
		formData.set("file", file);

		startTransition(async () => {
			try {
				const id = await createDocument(formData);
				toast.success("Dokumen dibuat.");
				setOpen(false);
				router.push(`/persuratan/${id}`);
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
						<PageHeaderDescription>
							Tanda tangan elektronik &amp; verifikasi dokumen.
						</PageHeaderDescription>
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
									<DialogDescription>
										Unggah PDF, undang penandatangan, lalu bubuhkan tanda
										tangan.
									</DialogDescription>
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
										<Label htmlFor="doc-signers">
											Undang penandatangan (opsional)
										</Label>
										<Textarea
											id="doc-signers"
											value={signers}
											onChange={(e) => setSigners(e.target.value)}
											placeholder="email1@smkdwiguna.sch.id, email2@smkdwiguna.sch.id"
											rows={2}
										/>
										<p className="text-xs text-muted-foreground">
											Penerima undangan bisa menandatangani tanpa izin fitur.
										</p>
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
								Anda akan melihat dokumen di sini ketika diundang menandatangani.
							</p>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{documents.map((doc) => (
						<Link key={doc.id} href={`/persuratan/${doc.id}`}>
							<Card className="transition hover:border-primary/50">
								<CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-start gap-3">
										<FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
										<div>
											<p className="font-medium">{doc.title}</p>
											<p className="text-xs text-muted-foreground">
												{doc.ownerEmail}
												{doc.isOwner ? " (Anda)" : ""}
											</p>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="outline">
											{doc.isPublic ? (
												<Globe className="mr-1 h-3 w-3" />
											) : (
												<Lock className="mr-1 h-3 w-3" />
											)}
											{doc.isPublic ? "Publik" : "Privat"}
										</Badge>
										<Badge variant="secondary">
											{doc.signedCount}/{doc.signerCount} tanda tangan
										</Badge>
										<Badge
											variant={
												doc.status === "COMPLETED" ? "default" : "outline"
											}
										>
											{STATUS_LABELS[doc.status] ?? doc.status}
										</Badge>
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
