import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

interface NotFoundScreenProps {
	title?: string;
	message?: string;
	primaryHref?: string;
	primaryLabel?: string;
	secondaryHref?: string;
	secondaryLabel?: string;
}

export function NotFoundScreen({
	title = "Halaman tidak ditemukan",
	message = "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
	primaryHref = "/",
	primaryLabel = "Kembali ke Beranda",
	secondaryHref,
	secondaryLabel,
}: NotFoundScreenProps) {
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
					<CardTitle className="text-2xl">{title}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 text-center">
					<p className="text-sm text-muted-foreground">{message}</p>
					<Button asChild variant="outline">
						<Link href={primaryHref}>{primaryLabel}</Link>
					</Button>
					{secondaryHref && secondaryLabel && (
						<Button asChild variant="ghost">
							<Link href={secondaryHref}>{secondaryLabel}</Link>
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
