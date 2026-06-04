"use client";

import { useEffect, useRef } from "react";
import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";
import { WORKSPACE_DOMAIN } from "@/lib/access";

/**
 * Renders the official "Sign in with Google" (One Tap) button and triggers the
 * One Tap prompt for returning users. Sign-up is disabled server-side, so the
 * first-ever login still goes through the standard OAuth flow (which also
 * captures the Drive refresh token).
 */
export function GoogleOneTap({
	clientId,
	callbackURL = "/",
}: {
	clientId: string;
	callbackURL?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!clientId || !container) return;

		const client = createAuthClient({
			plugins: [
				oneTapClient({
					clientId,
					autoSelect: false,
					cancelOnTapOutside: true,
					// Restrict the account chooser to the school workspace.
					additionalOptions: { hd: WORKSPACE_DOMAIN },
				}),
			],
		});

		client
			.oneTap({
				callbackURL,
				button: {
					container,
					config: {
						type: "standard",
						theme: "outline",
						size: "large",
						text: "continue_with",
						shape: "pill",
						width: 320,
						locale: "id",
					},
				},
			})
			.catch((error) => {
				// Never block the login screen if GSI is unavailable.
				console.warn("Google One Tap tidak tersedia:", error);
			});
	}, [clientId, callbackURL]);

	return <div ref={containerRef} className="flex min-h-[40px] justify-center" />;
}
