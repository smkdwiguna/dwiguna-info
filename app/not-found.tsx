import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
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
					<CardTitle className="text-2xl">Halaman tidak ditemukan</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 text-center">
					<Button asChild variant="outline">
						<Link href="/">Kembali ke Beranda</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
