"use client";

import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoginLogic() {
	const searchParams = useSearchParams();
	const isSso = searchParams.has("sso");

	useEffect(() => {
		authClient.signIn.social({
			provider: "google",
			callbackURL: isSso ? "/sso" : "/",
		});
	}, [isSso]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
			<div className="w-full max-w-xs text-center flex flex-col items-center gap-5">
				<div className="size-14 bg-primary rounded-xl flex items-center justify-center shadow-md animate-pulse">
					<span className="text-primary-foreground font-bold text-2xl leading-none">
						D
					</span>
				</div>
				<div className="flex flex-col gap-2 w-full items-center">
					<p className="font-semibold text-sm">Menghubungkan ke Google...</p>
					<div className="flex flex-col gap-2 w-full mt-2">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-4/5 mx-auto" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-muted/40" />
			}
		>
			<LoginLogic />
		</Suspense>
	);
}
