"use client";

import { useEffect } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { AUTH_SUCCESS_MESSAGE } from "@/components/login";

/**
 * Landing page for the OAuth popup window after a successful Google sign-in.
 * It notifies the window that opened it (same origin) and closes itself. When
 * opened directly (no opener), it just navigates home.
 */
export default function LoginPopupDonePage() {
	useEffect(() => {
		// Fast path: notify the opener (may be severed by COOP — ignore errors).
		try {
			window.opener?.postMessage(AUTH_SUCCESS_MESSAGE, window.location.origin);
		} catch {
			// opener unavailable; the opener polls the session as a fallback.
		}
		// A script-opened popup can close itself even when the opener link is
		// severed. If this page was opened directly (not a popup), close() is a
		// no-op, so fall back to navigating home shortly after.
		window.close();
		const timer = setTimeout(() => window.location.replace("/"), 800);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
			<div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
				<BrandLogo
					className="mx-auto h-12 w-fit"
					imageClassName="h-12 w-auto"
					width={300}
					height={48}
				/>
				<p className="text-sm font-semibold">Berhasil masuk, menutup jendela...</p>
			</div>
		</div>
	);
}
