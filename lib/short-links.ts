const SHORT_LINK_RESERVED_SEGMENTS = new Set(
	[
		"_next",
		"access",
		"api",
		"bulk-upload",
		"login",
		"presence",
		"settings",
		"shortlinks",
		"users",
	].map((value) => value.toLowerCase()),
);

const BASE64_URL_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function normalizeShortLinkSlug(value: string) {
	return value.trim();
}

export function isValidShortLinkSlugFormat(value: string) {
	return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function isReservedShortLinkSlug(value: string) {
	return SHORT_LINK_RESERVED_SEGMENTS.has(value.toLowerCase());
}

function encodeBase64Url(bytes: Uint8Array) {
	let output = "";
	for (let index = 0; index < bytes.length; index += 3) {
		const byte1 = bytes[index] ?? 0;
		const byte2 = bytes[index + 1];
		const byte3 = bytes[index + 2];
		const chunk = (byte1 << 16) | ((byte2 ?? 0) << 8) | (byte3 ?? 0);

		output += BASE64_URL_ALPHABET[(chunk >> 18) & 63];
		output += BASE64_URL_ALPHABET[(chunk >> 12) & 63];
		if (byte2 !== undefined) {
			output += BASE64_URL_ALPHABET[(chunk >> 6) & 63];
		}
		if (byte3 !== undefined) {
			output += BASE64_URL_ALPHABET[chunk & 63];
		}
	}

	return output;
}

export function generateRandomShortLinkSlug(length = 8) {
	const bytes = new Uint8Array(6);
	globalThis.crypto.getRandomValues(bytes);
	return encodeBase64Url(bytes).slice(0, length);
}

export function parseShortLinkTargetUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		throw new Error("URL tujuan wajib diisi.");
	}

	const normalized = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
		? trimmed
		: `https://${trimmed}`;

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		throw new Error("URL tujuan tidak valid.");
	}

	return parsed;
}
