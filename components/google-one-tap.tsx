"use client";

import { useEffect } from "react";
import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

/**
 * Triggers Google's native One Tap prompt (the FedCM account chooser the
 * browser renders itself — not a popup tab) for returning users. Sign-up is
 * disabled server-side, so the first-ever login still goes through the regular
 * OAuth button below (which also captures the Drive refresh token).
 *
 * This renders nothing: the prompt is an overlay drawn by Google. The styled
 * "Lanjutkan dengan akun smkdwiguna.sch.id" button stays as the explicit
 * fallback in the login card.
 */
export function GoogleOneTap({
	clientId,
	callbackURL = "/",
}: {
	clientId: string;
	callbackURL?: string;
}) {
	useEffect(() => {
		if (!clientId) return;

		const client = createAuthClient({
			plugins: [
				oneTapClient({
					clientId,
					autoSelect: false,
					cancelOnTapOutside: true,
					// Use the browser-native FedCM prompt instead of the legacy
					// third-party-cookie bubble.
					additionalOptions: { use_fedcm_for_prompt: true },
				}),
			],
		});

		// No `button` option → Better Auth calls google.accounts.id.prompt(),
		// which shows the native One Tap chooser.
		client
			.oneTap({ callbackURL })
			.catch((error) => {
				// Never block the login screen if GSI/FedCM is unavailable.
				console.warn("Google One Tap tidak tersedia:", error);
			});
	}, [clientId, callbackURL]);

	return null;
}
