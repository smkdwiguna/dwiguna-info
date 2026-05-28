"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ShortlinkRedirectClient({
	targetUrl,
	slug,
}: {
	targetUrl: string;
	slug: string;
}) {
	useEffect(() => {
		window.location.replace(targetUrl);
	}, [targetUrl]);

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/20 p-4">
			<div className="w-full max-w-lg rounded-2xl border bg-background p-6 text-center shadow-sm">
				<h1 className="mt-2 text-2xl font-semibold">Mengalihkan...</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Jika pengalihan otomatis gagal, buka tujuan ini secara langsung.
				</p>
				<Link
					href={targetUrl}
					target="_blank"
					rel="noreferrer"
					className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
				>
					Buka tujuan
				</Link>
			</div>
		</main>
	);
}
