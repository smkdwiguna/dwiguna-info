const DEFAULT_BYTE_LENGTH = 24;

/** Shared secret for device HMAC (hex string). */
export function generateTerminalPassword(
	byteLength = DEFAULT_BYTE_LENGTH,
): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

export function isTerminalPasswordValid(password: string): boolean {
	const trimmed = password.trim();
	return trimmed.length >= 16 && /^[\x21-\x7E]+$/.test(trimmed);
}
