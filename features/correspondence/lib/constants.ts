/** Public base URL used for QR codes / verification links. */
export function getSiteUrl(): string {
	const raw =
		process.env.NEXT_PUBLIC_SITE_URL ||
		process.env.BETTER_AUTH_URL ||
		"https://dwiguna.info";
	return raw.replace(/;$/, "").replace(/\/$/, "");
}

export function getVerifyUrl(documentId: string): string {
	return `${getSiteUrl()}/verify/${documentId}`;
}
