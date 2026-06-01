"use client";

import { useEffect, useState } from "react";
import { ShortLinksClient } from "@/features/short-links/components/short-links-client";
import {
	getCurrentUserShortLinks,
	type ShortLinkRecord,
} from "@/features/short-links/actions/short-links";

export function ShortLinksPage() {
	const [shortLinks, setShortLinks] = useState<ShortLinkRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let active = true;
		setIsLoading(true);

		(async () => {
			try {
				const result = await getCurrentUserShortLinks();
				if (active) {
					setShortLinks(result);
				}
			} catch (error) {
				console.error("Failed to load shortlinks", error);
				if (active) {
					setShortLinks([]);
				}
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	return (
		<ShortLinksClient initialShortLinks={shortLinks} isLoading={isLoading} />
	);
}
