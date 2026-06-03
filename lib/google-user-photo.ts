import { getAdminService, type GoogleUserRecord } from "@/lib/google-api";
import { isGooglePhotoNotFoundError } from "@/lib/device-user-photo";
import {
	getHighResPeoplePhotoUrl,
	upscaleGoogleCdnPhotoUrl,
} from "@/lib/google-people-photo";

export function decodeBase64Image(data: string): Uint8Array {
	const normalized = data
		.replace(/\s/g, "")
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const pad = normalized.length % 4;
	const padded = pad > 0 ? normalized + "=".repeat(4 - pad) : normalized;
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function fetchImageBytesFromUrl(
	url: string,
): Promise<Uint8Array | null> {
	try {
		const response = await fetch(url, {
			headers: { Accept: "image/*" },
		});
		if (!response.ok) return null;
		return new Uint8Array(await response.arrayBuffer());
	} catch (error) {
		console.warn("[google-user-photo] failed to fetch image URL", error);
		return null;
	}
}

function isGoogleHostedPhotoUrl(url: string): boolean {
	return /googleusercontent\.com|ggpht\.com/i.test(url);
}

async function resolveAdminUserProfile(
	email: string,
	user?: GoogleUserRecord,
): Promise<GoogleUserRecord | undefined> {
	if (user?.thumbnailPhotoUrl) return user;
	try {
		const response = await getAdminService().users.get({
			userKey: email,
			projection: "basic",
		});
		return response.data;
	} catch (error) {
		console.warn("[google-user-photo] users.get for thumbnail failed", error);
		return user;
	}
}

/**
 * Preferred order:
 * 1. People API directory search → high-res `=s512-c` CDN URL (optional scope)
 * 2. Admin SDK `photos.get` base64 payload
 * 3. Admin `thumbnailPhotoUrl` upscaled when hosted on Google CDN
 */
export async function loadGoogleUserPhotoBytes(
	email: string,
	user?: GoogleUserRecord,
): Promise<Uint8Array | null> {
	const profile = await resolveAdminUserProfile(email, user);

	try {
		const highResUrl = await getHighResPeoplePhotoUrl(email);
		if (highResUrl) {
			const bytes = await fetchImageBytesFromUrl(highResUrl);
			if (bytes) return bytes;
		}
	} catch (error) {
		console.warn(
			"[google-user-photo] People API photo skipped",
			email,
			error instanceof Error ? error.message : error,
		);
	}

	const adminService = getAdminService();

	try {
		const photoResponse = await adminService.users.photos.get({
			userKey: email,
		});
		if (photoResponse.data.photoData) {
			return decodeBase64Image(photoResponse.data.photoData);
		}
	} catch (error) {
		if (!isGooglePhotoNotFoundError(error)) {
			console.warn("[google-user-photo] photos.get failed", error);
		}
	}

	const thumbnailUrl = profile?.thumbnailPhotoUrl;
	if (thumbnailUrl) {
		const url = isGoogleHostedPhotoUrl(thumbnailUrl)
			? upscaleGoogleCdnPhotoUrl(thumbnailUrl)
			: thumbnailUrl;
		return fetchImageBytesFromUrl(url);
	}

	return null;
}
