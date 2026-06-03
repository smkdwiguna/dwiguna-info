import { getAdminService, type GoogleUserRecord } from "@/lib/google-api";
import { isGooglePhotoNotFoundError } from "@/lib/device-user-photo";

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
		console.warn("[google-user-photo] failed to fetch thumbnail URL", error);
		return null;
	}
}

/** Load profile image bytes from Admin API photoData and/or thumbnailPhotoUrl. */
export async function loadGoogleUserPhotoBytes(
	email: string,
	user?: GoogleUserRecord,
): Promise<Uint8Array | null> {
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

	const thumbnailUrl = user?.thumbnailPhotoUrl;
	if (thumbnailUrl) {
		return fetchImageBytesFromUrl(thumbnailUrl);
	}

	return null;
}
