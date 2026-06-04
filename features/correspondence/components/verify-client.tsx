"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	Download,
	FileCheck2,
	ShieldCheck,
	ShieldX,
	Stamp,
	Upload,
	XCircle,
} from "lucide-react";
import type { VerificationResult } from "../actions/verify";
import type { PublicDocumentInfo } from "../actions/verify";
import { PdfViewer } from "./pdf-viewer";

function ResultRow({ ok, label }: { ok: boolean; label: string }) {
	return (
		<div className="flex items-center gap-2 text-sm">
			{ok ? (
				<CheckCircle2 className="h-4 w-4 text-emerald-600" />
			) : (
				<XCircle className="h-4 w-4 text-destructive" />
			)}
			<span>{label}</span>
		</div>
	);
}

export function VerifyClient({
	documentId,
	publicDoc,
}: {
	documentId?: string;
	publicDoc?: PublicDocumentInfo | null;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);

	const isPublic = !!publicDoc?.isPublic;
	const fileUrl = documentId ? `/api/verify/${documentId}/file` : null;

	async function handleVerify() {
		const file = fileRef.current?.files?.[0];
		if (!file) return;
		setLoading(true);
		setResult(null);
		try {
			const formData = new FormData();
			formData.set("file", file);
			if (documentId) formData.set("documentId", documentId);
			const res = await fetch("/api/verify", {
				method: "POST",
				body: formData,
			});
			const json = (await res.json()) as VerificationResult;
			setResult(json);
		} catch {
			setResult(null);
		} finally {
			setLoading(false);
		}
	}

	const infoPanel = isPublic && publicDoc && (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">{publicDoc.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<p className="text-muted-foreground">
					Pemilik: {publicDoc.ownerName ?? publicDoc.ownerEmail}
				</p>
				{publicDoc.signers.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{publicDoc.signers.map((s) => (
							<Badge key={s.email} variant="outline">
								{s.name ?? s.email}
								{s.signedAt ? " ✓" : ""}
							</Badge>
						))}
					</div>
				)}
				{fileUrl && (
					<Button variant="outline" size="sm" asChild>
						<a href={fileUrl} download={`${publicDoc.title ?? "dokumen"}.pdf`}>
							<Download className="mr-1 h-4 w-4" /> Unduh berkas
						</a>
					</Button>
				)}
			</CardContent>
		</Card>
	);

	const privateNotice = documentId && publicDoc && !publicDoc.isPublic && (
		<Card>
			<CardContent className="py-4 text-sm text-muted-foreground">
				Dokumen ini bersifat privat. Unggah salinan Anda untuk memeriksa
				kecocokannya.
			</CardContent>
		</Card>
	);

	const uploadCard = (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">Pengecekan salinan</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-2">
					<Label htmlFor="verify-file">Berkas PDF</Label>
					<Input
						id="verify-file"
						type="file"
						accept="application/pdf"
						ref={fileRef}
					/>
				</div>
				<Button onClick={handleVerify} disabled={loading} className="w-full">
					<Upload className="mr-1 h-4 w-4" />
					{loading ? "Memeriksa..." : "Periksa Dokumen"}
				</Button>
			</CardContent>
		</Card>
	);

	const resultCard = result && (
		<Card
			className={
				result.isUntampered ? "border-emerald-500/50" : "border-destructive/50"
			}
		>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					{result.isUntampered ? (
						<ShieldCheck className="h-5 w-5 text-emerald-600" />
					) : (
						<ShieldX className="h-5 w-5 text-destructive" />
					)}
					{result.found ? (result.title ?? "Hasil Verifikasi") : "Tidak Dikenali"}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-sm text-muted-foreground">{result.message}</p>
				{result.found && (
					<div className="space-y-1 pt-2">
						<ResultRow
							ok={result.isUntampered}
							label="Dokumen belum dimodifikasi"
						/>
						<ResultRow
							ok={result.isCryptographicallyValid}
							label="Tanda tangan kriptografis valid"
						/>
						<ResultRow
							ok={result.isTrustedIdentity}
							label="Identitas terpercaya secara internal"
						/>
						<ResultRow
							ok={result.hasTimestamp}
							label="Memiliki penanda waktu elektronik"
						/>
					</div>
				)}
				{result.signers.length > 0 && (
					<div className="flex flex-wrap gap-2 pt-2">
						{result.signers.map((s) => (
							<Badge key={s.email} variant={s.trusted ? "default" : "outline"}>
								<Stamp className="mr-1 h-3 w-3" />
								{s.name ?? s.email}
							</Badge>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);

	const header = (
		<div className="space-y-1 text-center">
			<h1 className="flex items-center justify-center gap-2 text-2xl font-bold">
				<FileCheck2 className="h-6 w-6" /> Verifikasi Dokumen
			</h1>
			<p className="text-sm text-muted-foreground">
				Unggah salinan PDF untuk memeriksa keasliannya terhadap basis data tanda
				tangan elektronik.
			</p>
		</div>
	);

	// Public document: two columns on desktop (document left, menus right) and
	// render the document immediately without an extra click.
	if (isPublic && fileUrl) {
		return (
			<div className="mx-auto w-full max-w-6xl space-y-4 p-4">
				{header}
				<div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,380px)]">
					<Card className="order-2 lg:order-1">
						<CardContent>
							<PdfViewer url={fileUrl} />
						</CardContent>
					</Card>
					<div className="order-1 space-y-4 lg:order-2">
						{infoPanel}
						{uploadCard}
						{resultCard}
					</div>
				</div>
			</div>
		);
	}

	// Private/unknown document or the generic verify page: single column.
	return (
		<div className={cn("mx-auto w-full max-w-2xl space-y-4 p-4")}>
			{header}
			{privateNotice}
			{uploadCard}
			{resultCard}
		</div>
	);
}
