"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";

import { useEffect, Suspense } from "react";

function LoginLogic() {
	useEffect(() => {
	authClient.signIn
		.social({
			provider: "google",
			callbackURL: "/",
		})
		.catch((error) => {
			console.error("Failed to start Google login", error);
		});
	}, []);

	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
			<div className="w-full max-w-xs text-center flex flex-col items-center gap-5">
				<Image
					src="/SMK-TI-Dwiguna.png"
					alt="Logo SMK TI Dwiguna"
					className="text-center h-12 w-auto mx-auto"
					width={1219}
					height={195}
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
		<Suspense
			fallback={
				<div className="flex min-h-svh items-center justify-center bg-muted/40" />
			}
		>
			<LoginLogic />
		</Suspense>
	);
}
