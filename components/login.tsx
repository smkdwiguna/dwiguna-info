"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

// Small same-origin page the OAuth popup lands on after sign-in; it closes
// itself (and notifies this window as a fast path). Kept in sync with
// app/login/popup-done.
const POPUP_DONE_PATH = "/login/popup-done";
export const AUTH_SUCCESS_MESSAGE = "dwiguna-auth-success";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120000;

export default function Login() {
	const [connecting, setConnecting] = useState(false);
	const popupRef = useRef<Window | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stopPolling = useCallback(() => {
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	const finishSuccess = useCallback(() => {
		stopPolling();
		try {
			popupRef.current?.close();
		} catch {
			// Popup handle may be severed by COOP; ignore — it self-closes.
		}
		// The session cookie is now set (the popup's callback is same-origin),
		// so reloading re-renders this page as the authenticated app.
		window.location.reload();
	}, [stopPolling]);

	const cancel = useCallback(() => {
		stopPolling();
		try {
			popupRef.current?.close();
		} catch {
			// ignore
		}
		setConnecting(false);
	}, [stopPolling]);

	// Fast path: the popup posts a message once it lands on the done page.
	// (Polling below is the reliable fallback if COOP severs window.opener.)
	useEffect(() => {
		function onMessage(event: MessageEvent) {
			if (event.origin !== window.location.origin) return;
			if (event.data !== AUTH_SUCCESS_MESSAGE) return;
			finishSuccess();
		}
		window.addEventListener("message", onMessage);
		return () => {
			window.removeEventListener("message", onMessage);
			stopPolling();
		};
	}, [finishSuccess, stopPolling]);

	// Full-page redirect — used when the popup is blocked by the browser.
	const redirectFallback = useCallback(() => {
		const here = window.location.pathname + window.location.search;
		window.location.href = `/login?callbackURL=${encodeURIComponent(here)}`;
	}, []);

	const handleGoogleLogin = useCallback(() => {
		// Run the existing Google OAuth flow inside a popup window (the account
		// chooser shows in the popup; no full-page redirect). After the callback
		// the popup lands on POPUP_DONE_PATH and closes itself; meanwhile we poll
		// the session here so it works even if COOP severs the popup handle.
		const url = `/login?callbackURL=${encodeURIComponent(POPUP_DONE_PATH)}`;
		const width = 500;
		const height = 650;
		const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
		const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
		const popup = window.open(
			url,
			"dwiguna-google-login",
			`width=${width},height=${height},left=${left},top=${top}`,
		);

		if (!popup) {
			redirectFallback();
			return;
		}

		popupRef.current = popup;
		setConnecting(true);
		stopPolling();

		let elapsed = 0;
		pollRef.current = setInterval(async () => {
			elapsed += POLL_INTERVAL_MS;
			try {
				const { data } = await authClient.getSession();
				if (data?.user) {
					finishSuccess();
					return;
				}
			} catch {
				// Network blip while signing in — keep polling.
			}
			if (elapsed >= POLL_TIMEOUT_MS) {
				stopPolling();
				setConnecting(false);
			}
		}, POLL_INTERVAL_MS);
	}, [finishSuccess, redirectFallback, stopPolling]);

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
					<CardContent className="flex flex-col gap-3">
						<Button
							variant="outline"
							size="lg"
							className="w-full"
							onClick={handleGoogleLogin}
							disabled={connecting}
						>
							{connecting
								? "Menghubungkan ke Google..."
								: "Lanjutkan dengan akun smkdwiguna.sch.id"}
						</Button>
						{connecting && (
							<button
								type="button"
								onClick={cancel}
								className="text-xs text-muted-foreground underline-offset-4 hover:underline"
							>
								Batal
							</button>
						)}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
