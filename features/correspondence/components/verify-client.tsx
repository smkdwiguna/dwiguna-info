"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
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
		<Card className="pb-0">
			<CardHeader className="flex gap-4 justify-between">
				<CardTitle className="text-base">{publicDoc.title}</CardTitle>
				{fileUrl && (
					<Button variant="outline" size="sm" asChild>
						<a href={fileUrl} download={`${publicDoc.title ?? "dokumen"}.pdf`}>
							<Download className="mr-1 h-4 w-4" /> Unduh berkas
						</a>
					</Button>
				)}
			</CardHeader>
			<CardContent className="p-0">
				<Table className="bg-background">
					<TableBody>
						{publicDoc.signers.map((s) => (
							<TableRow key={s.email}>
								<TableCell className="text-center">
									{s.name ?? s.email}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
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
			<CardContent className="">
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
				{result && (
					<div className="space-y-1 pt-2">
						<p className="font-bold">{result.message}</p>
						<ResultRow ok={result.isUntampered} label="Keaslian dokumen" />
						<ResultRow
							ok={result.isCryptographicallyValid}
							label="Validasi kriptografis"
						/>
						<ResultRow
							ok={result.isTrustedIdentity}
							label="Pengecekan identitas"
						/>
						<ResultRow ok={result.hasTimestamp} label="Penanda waktu" />
					</div>
				)}
			</CardContent>
		</Card>
	);

	// Public document: two columns on desktop (document left, menus right) and
	// render the document immediately without an extra click.
	if (isPublic && fileUrl) {
		return (
			<div className="mx-auto w-full flex flex-col items-center max-w-6xl space-y-8 p-4">
				<BrandLogo />
				<div className="flex flex-col lg:flex-row-reverse gap-4 w-full">
					<div className="space-y-4">
						{infoPanel}
						{uploadCard}
					</div>
					<Card className="flex-1">
						<CardContent>
							<PdfViewer url={fileUrl} />
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Private/unknown document or the generic verify page: single column.
	return (
		<div className={cn("mx-auto w-full max-w-2xl space-y-4 p-4")}>
			{privateNotice}
			{uploadCard}
		</div>
	);
}
