"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RouteRefreshPollerProps {
	enabled?: boolean;
	intervalMs?: number;
}

export function RouteRefreshPoller({
	enabled = true,
	intervalMs = 45_000,
}: RouteRefreshPollerProps) {
	const router = useRouter();

	useEffect(() => {
		if (!enabled || intervalMs <= 0) return;

		const refresh = () => {
			if (document.visibilityState === "visible") {
				router.refresh();
			}
		};

		const timer = window.setInterval(refresh, intervalMs);
		document.addEventListener("visibilitychange", refresh);

		return () => {
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [enabled, intervalMs, router]);

	return null;
}
