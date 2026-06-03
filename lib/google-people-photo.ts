import { peopleRequest } from "@/lib/google-api";

/** Person entry from `people:searchDirectoryPeople`. */
export type SearchDirectoryPerson = {
	resourceName?: string;
	emailAddresses?: Array<{
		value?: string;
		metadata?: { primary?: boolean };
	}>;
};

/** Response body for `GET /v1/people:searchDirectoryPeople`. */
export type SearchDirectoryResponse = {
	people?: SearchDirectoryPerson[];
	/** Legacy/alternate field name seen in some client samples. */
	directoryPeople?: SearchDirectoryPerson[];
};

/** Response body for `GET /v1/{resourceName}?personFields=photos`. */
export type PeoplePhotoResponse = {
	resourceName?: string;
	photos?: Array<{
		url?: string;
		primary?: boolean;
		metadata?: { primary?: boolean };
	}>;
};

const DIRECTORY_SOURCE = "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE";
const HIGH_RES_PHOTO_SIZE = 512;

/**
 * Strip `=s96`, `=s100-c`, etc. and request a square CDN asset from Google.
 */
export function upscaleGoogleCdnPhotoUrl(
	url: string,
	size = HIGH_RES_PHOTO_SIZE,
): string {
	const base = url.split("=")[0];
	return `${base}=s${size}-c`;
}

function pickPrimaryPhotoUrl(photos: PeoplePhotoResponse["photos"]): string | null {
	if (!photos?.length) return null;
	const primary = photos.find((p) => p.primary || p.metadata?.primary);
	return primary?.url ?? photos[0]?.url ?? null;
}

function findResourceNameByEmail(
	response: SearchDirectoryResponse,
	email: string,
): string | null {
	const list = response.people ?? response.directoryPeople ?? [];
	const target = email.trim().toLowerCase();
	if (!target) return null;

	for (const person of list) {
		if (!person.resourceName) continue;
		const emails = person.emailAddresses ?? [];
		const hasExactEmail = emails.some(
			(entry) => entry.value?.trim().toLowerCase() === target,
		);
		if (hasExactEmail) return person.resourceName;
	}

	// Directory search query is the email — safe fallback when readMask omits emails.
	if (list.length === 1 && list[0]?.resourceName) {
		return list[0].resourceName;
	}

	return null;
}

/** Step 1: resolve Workspace email → People API `people/{id}` resource name. */
export async function resolvePeopleResourceNameByEmail(
	email: string,
): Promise<string | null> {
	const searchResult = await peopleRequest<SearchDirectoryResponse>(
		"/v1/people:searchDirectoryPeople",
		{
			params: {
				query: email,
				readMask: "emailAddresses,metadata",
				sources: DIRECTORY_SOURCE,
				pageSize: 10,
			},
		},
	);

	return findResourceNameByEmail(searchResult, email);
}

/**
 * Step 2: fetch profile with `personFields=photos` and return a high-res CDN URL.
 * Returns null when the user has no custom profile photo.
 */
export async function getHighResPeoplePhotoUrl(
	email: string,
): Promise<string | null> {
	try {
		const resourceName = await resolvePeopleResourceNameByEmail(email);
		if (!resourceName) return null;

		const profile = await peopleRequest<PeoplePhotoResponse>(
			`/v1/${resourceName}`,
			{
				params: { personFields: "photos" },
			},
		);

		const rawPhotoUrl = pickPrimaryPhotoUrl(profile.photos);
		if (!rawPhotoUrl) return null;

		return upscaleGoogleCdnPhotoUrl(rawPhotoUrl, HIGH_RES_PHOTO_SIZE);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("unauthorized_client")) {
			console.warn(
				"[google-people-photo] People API scope not delegated in Workspace Admin; using Admin/thumbnail fallback.",
			);
		} else {
			console.warn(
				"[google-people-photo] failed to resolve high-res photo",
				email,
				error,
			);
		}
		return null;
	}
}
