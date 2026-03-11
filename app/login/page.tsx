"use client";

import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

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
		<div className="flex min-h-screen items-center justify-center bg-zinc-50">
			<div className="text-center animate-pulse">
				<div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold">
					D
				</div>
				<p className="text-zinc-600 font-medium">
					Menghubungkan ke Dwiguna.Info...
				</p>
				<p className="text-sm text-zinc-400 mt-2">
					Meneruskan SSO dengan Google
				</p>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={<p>Loading...</p>}>
			<LoginLogic />
		</Suspense>
	);
}
