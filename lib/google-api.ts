export const ADMIN_SCOPES = [
	"https://www.googleapis.com/auth/admin.directory.user",
	"https://www.googleapis.com/auth/admin.directory.group",
	"https://www.googleapis.com/auth/admin.directory.orgunit",
	"https://www.googleapis.com/auth/admin.directory.userschema",
] as const;

export const PEOPLE_SCOPES = [
	"https://www.googleapis.com/auth/directory.readonly",
] as const;

const SUBJECT = "proktor@smkdwiguna.sch.id";
export const ADMIN_BASE = "https://admin.googleapis.com/admin/directory/v1";
export const PEOPLE_BASE = "https://people.googleapis.com";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type GoogleUserName = {
	fullName?: string;
	givenName?: string;
	familyName?: string;
};

export type GoogleUserRecord = {
	id?: string;
	primaryEmail?: string;
	name?: GoogleUserName;
	orgUnitPath?: string;
	suspended?: boolean;
	thumbnailPhotoUrl?: string;
	customSchemas?: Record<string, Record<string, unknown>>;
	password?: string;
	changePasswordAtNextLogin?: boolean;
};

export type GoogleUserPhoto = {
	photoData?: string;
	mimeType?: string;
	kind?: string;
};

export type GoogleSchema = {
	schemaName?: string;
	fields?: Array<{ fieldName?: string }>;
};

type GoogleListResponse<T> = {
	users?: T[];
	schemas?: GoogleSchema[];
	organizationUnits?: Array<{ orgUnitPath?: string }>;
	nextPageToken?: string;
};

export type GoogleAdminService = {
	users: {
		list(options: {
			customer?: string;
			pageToken?: string;
			projection?: string;
			fields?: string;
			maxResults?: number;
		}): Promise<{
			data: { users?: GoogleUserRecord[]; nextPageToken?: string };
		}>;
		get(options: {
			userKey: string;
			projection?: string;
			fields?: string;
		}): Promise<{ data: GoogleUserRecord }>;
		update(options: {
			userKey: string;
			requestBody: Record<string, unknown>;
		}): Promise<{ data: GoogleUserRecord }>;
		insert(options: {
			requestBody: Record<string, unknown>;
		}): Promise<{ data: GoogleUserRecord }>;
		delete(options: { userKey: string }): Promise<{ data: null }>;
		photos: {
			get(options: { userKey: string }): Promise<{ data: GoogleUserPhoto }>;
			update(options: {
				userKey: string;
				requestBody: { photoData: string };
			}): Promise<{ data: GoogleUserPhoto }>;
		};
	};
	schemas: {
		list(options: {
			customerId: string;
		}): Promise<{ data: { schemas?: GoogleSchema[] } }>;
	};
};

function b64url(input: ArrayBuffer | string): string {
	const normalized =
		typeof input === "string"
			? new TextEncoder().encode(input)
			: new Uint8Array(input);
	let binary = "";
	for (const byte of normalized) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
	const stripped = pem
		.replace(/-----BEGIN PRIVATE KEY-----/g, "")
		.replace(/-----END PRIVATE KEY-----/g, "")
		.replace(/\s+/g, "");

	const binary = Uint8Array.from(atob(stripped), (c) => c.charCodeAt(0));

	return crypto.subtle.importKey(
		"pkcs8",
		binary.buffer,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
}

async function buildJWT(
	clientEmail: string,
	privateKey: string,
	scopes: readonly string[],
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);

	const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const payload = b64url(
		JSON.stringify({
			iss: clientEmail,
			sub: SUBJECT,
			scope: scopes.join(" "),
			aud: TOKEN_ENDPOINT,
			iat: now,
			exp: now + 3600,
		}),
	);

	const signingInput = `${header}.${payload}`;
	const key = await importPrivateKey(privateKey);
	const sig = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(signingInput),
	);

	return `${signingInput}.${b64url(sig)}`;
}

const tokenCache = new Map<string, { value: string; expiresAt: number }>();

export async function getAccessToken(
	scopes: readonly string[] = ADMIN_SCOPES,
): Promise<string> {
	const cacheKey = scopes.join(" ");
	const now = Date.now();
	const cached = tokenCache.get(cacheKey);
	if (cached && cached.expiresAt > now + 30_000) {
		return cached.value;
	}

	const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
	const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
	const privateKey = rawPrivateKey
		? Buffer.from(rawPrivateKey, "base64").toString("utf-8").trim()
		: "";

	if (!clientEmail || !privateKey) {
		throw new Error(
			"GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be configured for Google Admin API access.",
		);
	}

	const jwt = await buildJWT(clientEmail, privateKey, scopes);

	const res = await fetch(TOKEN_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`[Google Auth] Failed to get access token: ${body}`);
	}

	const json = (await res.json()) as {
		access_token: string;
		expires_in: number;
	};
	tokenCache.set(cacheKey, {
		value: json.access_token,
		expiresAt: now + json.expires_in * 1000,
	});

	return json.access_token;
}

export type GoogleApiRequestOptions = {
	method?: string;
	params?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
	headers?: HeadersInit;
};

/** Authenticated request against any Google REST base (Admin, People, …). */
export async function googleApiRequest<T>(
	baseUrl: string,
	path: string,
	options: GoogleApiRequestOptions = {},
	apiLabel = "Google API",
	scopes: readonly string[] = ADMIN_SCOPES,
): Promise<T> {
	const token = await getAccessToken(scopes);
	const url = new URL(`${baseUrl}${path}`);

	for (const [key, value] of Object.entries(options.params || {})) {
		if (value === undefined || value === null || value === "") continue;
		url.searchParams.set(key, String(value));
	}

	const hasBody = options.body !== undefined;
	const response = await fetch(url.toString(), {
		method: options.method || (hasBody ? "POST" : "GET"),
		headers: {
			Authorization: `Bearer ${token}`,
			...(hasBody ? { "content-type": "application/json" } : {}),
			...options.headers,
		},
		body: hasBody ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		const body = await response.text();
		const err = Object.assign(new Error(`${apiLabel} error: ${body}`), {
			status: response.status,
		});
		throw err;
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

export async function adminRequest<T>(
	path: string,
	options: GoogleApiRequestOptions = {},
): Promise<T> {
	return googleApiRequest<T>(
		ADMIN_BASE,
		path,
		options,
		"Google Admin API",
		ADMIN_SCOPES,
	);
}

export async function peopleRequest<T>(
	path: string,
	options: GoogleApiRequestOptions = {},
): Promise<T> {
	return googleApiRequest<T>(
		PEOPLE_BASE,
		path,
		options,
		"Google People API",
		PEOPLE_SCOPES,
	);
}

export function getAdminService(): GoogleAdminService {
	return {
		users: {
			list: async (options) => {
				const data = await adminRequest<GoogleListResponse<GoogleUserRecord>>(
					"/users",
					{
						params: {
							customer: options.customer,
							pageToken: options.pageToken,
							projection: options.projection,
							fields: options.fields,
							maxResults: options.maxResults,
						},
					},
				);

				return {
					data: {
						users: data.users,
						nextPageToken: data.nextPageToken,
					},
				};
			},
			get: async (options) => {
				const data = await adminRequest<GoogleUserRecord>(
					`/users/${encodeURIComponent(options.userKey)}`,
					{
						params: {
							projection: options.projection,
							fields: options.fields,
						},
					},
				);

				return { data };
			},
			update: async (options) => {
				const data = await adminRequest<GoogleUserRecord>(
					`/users/${encodeURIComponent(options.userKey)}`,
					{
						method: "PUT",
						body: options.requestBody,
					},
				);

				return { data };
			},
			insert: async (options) => {
				const data = await adminRequest<GoogleUserRecord>("/users", {
					method: "POST",
					body: options.requestBody,
				});

				return { data };
			},
			delete: async (options) => {
				await adminRequest<null>(
					`/users/${encodeURIComponent(options.userKey)}`,
					{
						method: "DELETE",
					},
				);

				return { data: null };
			},
			photos: {
				get: async (options) => {
					const data = await adminRequest<GoogleUserPhoto>(
						`/users/${encodeURIComponent(options.userKey)}/photos/thumbnail`,
						{ method: "GET" },
					);

					return { data };
				},
				update: async (options) => {
					const data = await adminRequest<GoogleUserPhoto>(
						`/users/${encodeURIComponent(options.userKey)}/photos/thumbnail`,
						{
							method: "PUT",
							body: options.requestBody,
						},
					);

					return { data };
				},
			},
		},
		schemas: {
			list: async (options) => {
				const data = await adminRequest<GoogleListResponse<never>>(
					`/customer/${encodeURIComponent(options.customerId)}/schemas`,
					{ method: "GET" },
				);

				return {
					data: {
						schemas: data.schemas,
					},
				};
			},
		},
	};
}

export async function fetchAllOrgUnits(): Promise<string[]> {
	try {
		const data = await adminRequest<GoogleListResponse<never>>(
			"/customer/my_customer/orgunits",
			{
				params: { type: "all" },
			},
		);

		return (data.organizationUnits ?? []).map((ou) => ou.orgUnitPath ?? "/");
	} catch (error) {
		console.error("[Google API Error - fetchAllOrgUnits]:", error);
		return [];
	}
}

export async function fetchUserOUFromWorkspace(email: string): Promise<string> {
	try {
		const adminService = getAdminService();
		const data = await adminService.users.get({
			userKey: email,
			projection: "full",
		});
		return data.data.orgUnitPath ?? "/";
	} catch (error) {
		const status = (error as { status?: number }).status;
		if (status === 401 || status === 403) {
			console.warn(
				"[Google API Warning - fetchUserOUFromWorkspace]: unauthorized OU lookup; continuing with fallback org unit.",
			);
			return "/";
		}
		console.error("[Google API Error - fetchUserOUFromWorkspace]:", error);
		return "/";
	}
}

function normalizeCustomSchemaValue(value: unknown): string {
	if (typeof value === "string") return value.trim();
	if (Array.isArray(value)) {
		return value
			.map((item) => (typeof item === "string" ? item.trim() : ""))
			.filter(Boolean)
			.join(",");
	}
	if (!value || typeof value !== "object") return "";

	const record = value as { value?: unknown };
	return normalizeCustomSchemaValue(record.value);
}

export async function fetchUserAccessFromWorkspace(
	email: string,
): Promise<string> {
	try {
		const adminService = getAdminService();
		const data = await adminService.users.get({
			userKey: email,
			projection: "full",
		});

		const customSchemas = data.data.customSchemas;
		if (!customSchemas) return "";

		const pickAccess = (fields: Record<string, unknown>): string =>
			normalizeCustomSchemaValue(fields.access) ||
			normalizeCustomSchemaValue(fields.permissions) ||
			normalizeCustomSchemaValue(fields.permission);

		const targetSchema = process.env.GOOGLE_CUSTOM_SCHEMA_NAME;
		if (targetSchema && customSchemas[targetSchema]) {
			const v = pickAccess(customSchemas[targetSchema]);
			if (v) return v;
		}

		for (const schemaValue of Object.values(customSchemas)) {
			const v = pickAccess(schemaValue);
			if (v) return v;
		}

		return "";
	} catch (error) {
		const status = (error as { status?: number }).status;
		if (status === 401 || status === 403) {
			console.warn(
				"[Google API Warning - fetchUserAccessFromWorkspace]: unauthorized access lookup; continuing without workspace access.",
			);
			return "";
		}
		console.error("[Google API Error - fetchUserAccessFromWorkspace]:", error);
		return "";
	}
}

export async function fetchAllWorkspaceUsers(): Promise<GoogleUserRecord[]> {
	const adminService = getAdminService();
	const allUsers: GoogleUserRecord[] = [];
	let pageToken: string | undefined;

	do {
		const response = await adminService.users.list({
			customer: "my_customer",
			pageToken,
			projection: "full",
			fields:
				"users(id,name,primaryEmail,orgUnitPath,suspended,thumbnailPhotoUrl,customSchemas),nextPageToken",
			maxResults: 500,
		});

		if (response.data.users) {
			allUsers.push(...response.data.users);
		}
		pageToken = response.data.nextPageToken || undefined;
	} while (pageToken);

	return allUsers;
}
