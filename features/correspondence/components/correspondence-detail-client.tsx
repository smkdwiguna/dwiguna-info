"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderBack,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, Download, Globe, PenLine } from "lucide-react";
import { PdfViewer, type QrBox } from "./pdf-viewer";
import { UserPicker, type UserOption } from "@/components/user-picker";
import { inviteSigner, setDocumentPublic } from "../actions/documents";
import type { DocumentDetail } from "../actions/documents";

const STATUS_LABELS: Record<string, string> = {
	DRAFT: "Draf",
	PARTIAL: "Sebagian",
	COMPLETED: "Selesai",
	INVITED: "Diundang",
	SIGNED: "Sudah TTE",
};

export function CorrespondenceDetailClient({
	detail,
	users = [],
}: {
	detail: DocumentDetail;
	users?: UserOption[];
}) {
	const router = useRouter();
	const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
	const [box, setBox] = useState<QrBox | null>(null);
	const [isPublic, setIsPublic] = useState(detail.isPublic);
	const [signing, setSigning] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		let active = true;
		setPdfData(null);
		fetch(`/api/correspondence/${detail.id}/file`, { credentials: "include" })
			.then((res) => {
				if (!res.ok) throw new Error("Gagal memuat berkas");
				return res.arrayBuffer();
			})
			.then((buf) => {
				if (active) setPdfData(new Uint8Array(buf));
			})
			.catch(() => {
				if (active) toast.error("Gagal memuat berkas PDF.");
			});
		return () => {
			active = false;
		};
	}, [detail.id, reloadKey]);

	function handleDownload() {
		if (!pdfData) return;
		const blob = new Blob([pdfData.slice()], { type: "application/pdf" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${detail.title}.pdf`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	async function handleSign() {
		if (!box) {
			toast.error(
				"Tentukan posisi QR dengan mengetuk dokumen terlebih dahulu.",
			);
			return;
		}
		setSigning(true);
		try {
			const res = await fetch("/api/correspondence/sign", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ documentId: detail.id, placement: box }),
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(json.error || "Gagal menandatangani.");
			toast.success("Dokumen berhasil ditandatangani.");
			setBox(null);
			setReloadKey((k) => k + 1);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Gagal menandatangani.",
			);
		} finally {
			setSigning(false);
		}
	}

	function handleTogglePublic(next: boolean) {
		setIsPublic(next);
		startTransition(async () => {
			try {
				await setDocumentPublic(detail.id, next);
				toast.success(
					next ? "Dokumen dipublikasikan." : "Dokumen disetel privat.",
				);
				router.refresh();
			} catch (error) {
				setIsPublic(!next);
				toast.error(
					error instanceof Error ? error.message : "Gagal memperbarui.",
				);
			}
		});
	}

	function handleInvite(emails: string[]) {
		const email = emails[emails.length - 1]?.trim();
		if (!email) return;
		startTransition(async () => {
			try {
				await inviteSigner(detail.id, email);
				toast.success("Penandatangan diundang.");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Gagal mengundang.",
				);
			}
		});
	}

	const signAction = detail.canSign ? (
		<>
			<Button
				className="w-full"
				onClick={handleSign}
				disabled={signing || !box || !pdfData}
			>
				<PenLine className="mr-1 h-4 w-4" />
				{signing ? "Memproses..." : "Tandatangani"}
			</Button>
			{!box && (
				<p className="text-xs text-muted-foreground">
					Ketuk dokumen untuk menaruh QR.
				</p>
			)}
		</>
	) : null;

	return (
		<div className={cn("space-y-4", detail.canSign && "pb-28 lg:pb-0")}>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderBack />
					<div>
						<PageHeaderTitle>{detail.title}</PageHeaderTitle>
						<PageHeaderDescription>
							{detail.ownerName} · {detail.signedCount}/{detail.signerCount}{" "}
							tanda tangan
						</PageHeaderDescription>
					</div>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Button
						variant="outline"
						onClick={handleDownload}
						disabled={!pdfData}
					>
						<Download className="mr-1 h-4 w-4" /> Unduh berkas
					</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
				<Card className="order-1">
					<CardContent>
						{detail.canSign && (
							<div className="mb-3 rounded-md bg-muted p-3 text-sm">
								<p className="font-medium">Bubuhkan tanda tangan</p>
								<p className="text-muted-foreground">
									Ketuk dokumen untuk menempatkan kode QR, lalu geser/ubah
									ukurannya. Tekan &quot;Tandatangani&quot; bila sudah pas.
								</p>
							</div>
						)}
						<PdfViewer
							data={pdfData}
							placementMode={detail.canSign}
							box={box}
							onBoxChange={setBox}
						/>
					</CardContent>
				</Card>

				<div className="order-2 space-y-4">
					{detail.canSign && (
						<Card className="hidden lg:block lg:sticky lg:top-4">
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Tindakan</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">{signAction}</CardContent>
						</Card>
					)}

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Penandatangan</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{detail.signers.map((s) => (
								<div
									key={s.email}
									className="flex items-center justify-between gap-2 text-sm"
								>
									<span className="min-w-0 truncate">{s.name || s.email}</span>
									<Badge
										variant={s.status === "SIGNED" ? "default" : "outline"}
									>
										{s.status === "SIGNED" ? (
											<CheckCircle2 className="mr-1 h-3 w-3" />
										) : (
											<Clock className="mr-1 h-3 w-3" />
										)}
										{STATUS_LABELS[s.status] ?? s.status}
									</Badge>
								</div>
							))}
						</CardContent>
					</Card>

					{detail.canManage && (
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Pengaturan</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center justify-between gap-2 rounded-md border p-3">
									<Label htmlFor="public-toggle" className="font-normal">
										<Globe className="mr-1 inline h-3 w-3" />
										Dapat dilihat publik
									</Label>
									<Switch
										id="public-toggle"
										checked={isPublic}
										onCheckedChange={handleTogglePublic}
										disabled={isPending}
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-xs">Undang penandatangan</Label>
									<UserPicker
										users={users}
										value={[]}
										onChange={handleInvite}
										disabled={isPending}
										hideSelected
										excludeEmails={[
											detail.ownerEmail,
											...detail.signers.map((s) => s.email),
										]}
										placeholder="Cari nama penandatangan..."
									/>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{detail.canSign && (
				<div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
					<div className="mx-auto max-w-3xl space-y-2">{signAction}</div>
				</div>
			)}
		</div>
	);
}
