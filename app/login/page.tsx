"use client";

import { authClient } from "@/lib/auth-client";
import { BrandLogo } from "@/components/brand-logo";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { SuspenseSpinner } from "@/components/suspense-spinner";

function LoginLogic() {
	const searchParams = useSearchParams();
	const callbackURL = searchParams.get("callbackURL") || "/";

	useEffect(() => {
		authClient.signIn
			.social({
				provider: "google",
				callbackURL: callbackURL,
			})
			.catch((error) => {
				console.error("Failed to start Google login", error);
			});
	}, [callbackURL]);

	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
			<div className="w-full max-w-xs text-center flex flex-col items-center gap-5">
				<BrandLogo
					className="mx-auto h-12 w-fit"
					imageClassName="h-12 w-auto"
					width={300}
					height={48}
				/>

				<div className="flex flex-col gap-2 w-full items-center">
					<p className="font-semibold text-sm">Menghubungkan ke Google...</p>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={<SuspenseSpinner className="min-h-svh bg-muted/40" />}>
			<LoginLogic />
		</Suspense>
	);
}
