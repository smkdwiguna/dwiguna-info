"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/20 p-4">
			<Card className="w-full max-w-lg shadow-sm">
				<CardHeader className="flex flex-col gap-4 items-center text-center">
					<BrandLogo
						className="h-10 w-fit"
						imageClassName="h-10 w-auto"
						width={250}
						height={40}
					/>
					<CardTitle className="text-2xl">Terjadi kesalahan</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 text-center">
					{process.env.NODE_ENV !== "production" ? (
						<p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-left text-xs text-destructive">
							{error.message}
						</p>
					) : null}
					<div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
						<Button variant="outline" onClick={reset}>
							Coba Lagi
						</Button>
						<Button asChild>
							<Link href="/">Ke Beranda</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
