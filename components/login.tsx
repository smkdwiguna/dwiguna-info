"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

// Factory so the inferred client type includes the One Tap plugin actions.
function createOneTapClient(clientId: string) {
	return createAuthClient({
		plugins: [
			oneTapClient({
				clientId,
				autoSelect: false,
				cancelOnTapOutside: true,
				// Render the browser-native FedCM account chooser overlay
				// instead of the legacy bubble.
				additionalOptions: { use_fedcm_for_prompt: true },
			}),
		],
	});
}

export default function Login({ googleClientId }: { googleClientId?: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const searchStr = searchParams.toString();
	const currentUrl = pathname + (searchStr ? `?${searchStr}` : "");

	// Full OAuth redirect — used as a fallback when the native prompt can't show.
	const redirectFallback = useCallback(() => {
		router.replace(`/login?callbackURL=${encodeURIComponent(currentUrl)}`);
	}, [router, currentUrl]);

	const handleGoogleLogin = useCallback(() => {
		if (!googleClientId) {
			redirectFallback();
			return;
		}
		// Built lazily on click; loadGoogleScript caches the GSI script.
		const client = createOneTapClient(googleClientId);

		let fellBack = false;
		const fallback = () => {
			if (fellBack) return;
			fellBack = true;
			redirectFallback();
		};

		// No `button` option → google.accounts.id.prompt() shows the native
		// FedCM chooser. On success the plugin navigates to callbackURL itself.
		client
			.oneTap({
				callbackURL: currentUrl,
				onPromptNotification: (notification) => {
					// If the native prompt can't be displayed (origin not
					// configured, FedCM cooldown, etc.), fall back to full OAuth.
					const notDisplayed = notification.isNotDisplayed?.() ?? false;
					const skipped = notification.isSkippedMoment?.() ?? false;
					if (notDisplayed || skipped) fallback();
				},
			})
			.catch(() => {
				fallback();
			});
	}, [googleClientId, currentUrl, redirectFallback]);

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
