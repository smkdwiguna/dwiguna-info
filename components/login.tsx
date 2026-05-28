"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

export default function Login() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const handleGoogleLogin = () => {
		const searchStr = searchParams.toString();
		const currentUrl = pathname + (searchStr ? `?${searchStr}` : "");
		router.replace(`/login?callbackURL=${encodeURIComponent(currentUrl)}`);
	};

	return (
		<main className="min-h-svh bg-muted/40 flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6">
				<BrandLogo
					className="mx-auto h-12 w-fit"
					imageClassName="h-12 w-auto"
					width={300}
					height={48}
				/>

				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-xl">Dwiguna.Info</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<Button
							variant="outline"
							size="lg"
							className="w-full"
							onClick={handleGoogleLogin}
						>
							Lanjutkan dengan akun smkdwiguna.sch.id
						</Button>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
