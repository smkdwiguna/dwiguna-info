import { Buffer } from "buffer";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

const SUBJECT = "proktor@smkdwiguna.sch.id";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

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
	subject: string,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);

	const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const payload = b64url(
		JSON.stringify({
			iss: clientEmail,
			// Domain-wide delegation: impersonate this workspace user so files
			// land in *their* Drive. Defaults to the central proktor account.
			sub: subject,
			scope: DRIVE_SCOPES.join(" "),
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

const driveTokenCache = new Map<string, { value: string; expiresAt: number }>();

async function getDriveAccessToken(subject: string = SUBJECT): Promise<string> {
	const now = Date.now();
	const cached = driveTokenCache.get(subject);
	if (cached && cached.expiresAt > now + 30_000) {
		return cached.value;
	}

	const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
	const privateKeyBase64 = process.env.GOOGLE_PRIVATE_KEY?.trim();

	if (!clientEmail || !privateKeyBase64) {
		throw new Error(
			"GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be configured for Google Drive access.",
		);
	}

	const privateKey = Buffer.from(privateKeyBase64, "base64")
		.toString("utf-8")
		.trim();

	const jwt = await buildJWT(clientEmail, privateKey, subject);

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
		throw new Error(`[Google Drive Auth] Failed to get access token: ${body}`);
	}

	const json = (await res.json()) as {
		access_token: string;
		expires_in: number;
	};
	const token = {
		value: json.access_token,
		expiresAt: now + json.expires_in * 1000,
	};
	driveTokenCache.set(subject, token);

	return token.value;
}

// Drive REST API helper
async function driveRequest<T>(
	path: string,
	options: {
		method?: string;
		params?: Record<string, string>;
		body?: any;
		headers?: Record<string, string>;
		isUpload?: boolean;
		rawBody?: BodyInit;
		subject?: string;
	} = {},
): Promise<T> {
	const token = await getDriveAccessToken(options.subject);
	const base = options.isUpload ? UPLOAD_BASE : DRIVE_BASE;
	const url = new URL(`${base}${path}`);

	if (options.params) {
		for (const [key, value] of Object.entries(options.params)) {
			if (value) url.searchParams.set(key, value);
		}
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		...options.headers,
	};

	let requestBody: any = undefined;
	if (options.rawBody) {
		requestBody = options.rawBody;
	} else if (options.body) {
		requestBody = JSON.stringify(options.body);
		headers["Content-Type"] = "application/json";
	}

	const res = await fetch(url.toString(), {
		method: options.method || (requestBody ? "POST" : "GET"),
		headers,
		body: requestBody,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google Drive API error (${res.status}): ${text}`);
	}

	if (res.status === 204) return undefined as any;
	return (await res.json()) as T;
}

/**
 * Find or create a folder in Drive.
 */
async function findOrCreateFolder(
	name: string,
	parentFolderId?: string,
	subject?: string,
): Promise<string> {
	let query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
	if (parentFolderId) {
		query += ` and '${parentFolderId}' in parents`;
	} else {
		query += ` and 'root' in parents`;
	}

	const list = await driveRequest<{ files: Array<{ id: string }> }>("/files", {
		subject,
		params: {
			q: query,
			fields: "files(id)",
			spaces: "drive",
		},
	});

	if (list.files && list.files.length > 0) {
		return list.files[0].id;
	}

	// Create folder
	const newFolder = await driveRequest<{ id: string }>("/files", {
		subject,
		method: "POST",
		body: {
			name,
			mimeType: "application/vnd.google-apps.folder",
			parents: parentFolderId ? [parentFolderId] : undefined,
		},
	});

	return newFolder.id;
}

/**
 * Prepares the folder structure: /Dwiguna.Info/Inventaris/[inventoryName]
 * Returns the leaf folder ID.
 */
export async function getInventoryFolderId(
	inventoryName: string,
): Promise<string> {
	const rootFolderId = await findOrCreateFolder("Dwiguna.Info");
	const inventarisFolderId = await findOrCreateFolder(
		"Inventaris",
		rootFolderId,
	);
	return await findOrCreateFolder(inventoryName, inventarisFolderId);
}

/**
 * Checks if a file name exists in the folder, if so appends timestamp to prevent conflict.
 */
async function getUniqueFileName(
	folderId: string,
	originalName: string,
	subject?: string,
): Promise<string> {
	const query = `name = '${originalName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
	const list = await driveRequest<{ files: Array<{ id: string }> }>("/files", {
		subject,
		params: {
			q: query,
			fields: "files(id)",
		},
	});

	if (!list.files || list.files.length === 0) {
		return originalName;
	}

	// Add unique timestamp prefix/suffix
	const extIndex = originalName.lastIndexOf(".");
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.replace("T", "_")
		.substring(0, 19);

	if (extIndex === -1) {
		return `${originalName} (${timestamp})`;
	}

	const base = originalName.substring(0, extIndex);
	const ext = originalName.substring(extIndex);
	return `${base} (${timestamp})${ext}`;
}

/**
 * Uploads a file to Google Drive.
 */
export async function uploadFileToDrive(
	inventoryName: string,
	fileName: string,
	fileMime: string,
	fileBuffer: ArrayBuffer,
): Promise<{
	id: string;
	name: string;
	webViewLink: string;
	thumbnailLink: string;
}> {
	const folderId = await getInventoryFolderId(inventoryName);
	const uniqueName = await getUniqueFileName(folderId, fileName);

	// Multipart upload metadata & media
	const metadata = {
		name: uniqueName,
		parents: [folderId],
	};

	const boundary = "314159265358979323846";
	const delimiter = `--${boundary}\r\n`;
	const closeDelimiter = `\r\n--${boundary}--`;

	const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
	const mediaPartHeader = `${delimiter}Content-Type: ${fileMime}\r\n\r\n`;

	const multipartBody = Buffer.concat([
		Buffer.from(metadataPart),
		Buffer.from(mediaPartHeader),
		Buffer.from(fileBuffer),
		Buffer.from(closeDelimiter),
	]);

	const uploadResult = await driveRequest<{ id: string }>("/files", {
		method: "POST",
		isUpload: true,
		params: {
			uploadType: "multipart",
		},
		headers: {
			"Content-Type": `multipart/related; boundary=${boundary}`,
		},
		rawBody: multipartBody as any,
	});

	const fileId = uploadResult.id;

	// Set file permissions so anyone inside or outside can view it via link
	await driveRequest(`/files/${fileId}/permissions`, {
		method: "POST",
		body: {
			role: "reader",
			type: "anyone",
		},
	});

	// Fetch fresh links
	const fileDetails = await driveRequest<{
		id: string;
		name: string;
		webViewLink: string;
		thumbnailLink: string;
	}>(`/files/${fileId}`, {
		params: {
			fields: "id,name,webViewLink,thumbnailLink",
		},
	});

	return {
		id: fileDetails.id,
		name: fileDetails.name,
		webViewLink: fileDetails.webViewLink,
		thumbnailLink: fileDetails.thumbnailLink || "",
	};
}

/**
 * Deletes a file in Google Drive.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
	await driveRequest(`/files/${fileId}`, {
		method: "DELETE",
	});
}

// ---------------------------------------------------------------------------
// Correspondence (TTE) helpers
// ---------------------------------------------------------------------------

export interface DriveUploadResult {
	id: string;
	name: string;
	webViewLink: string;
	thumbnailLink: string;
	/** The Drive account the file actually landed in. */
	ownerEmail: string;
}

/**
 * Folder structure for signed documents: /Dwiguna.Info/Persuratan/.
 * When impersonating a user (subject = their email) this is created in *their*
 * Drive; otherwise it lives under the central service account, namespaced by
 * the owner's email so files stay separated.
 */
async function getSignatureFolderId(
	ownerEmail: string,
	subject?: string,
): Promise<string> {
	const rootFolderId = await findOrCreateFolder("Dwiguna.Info", undefined, subject);
	const signFolderId = await findOrCreateFolder(
		"Persuratan",
		rootFolderId,
		subject,
	);
	// Central fallback keeps each owner's files in their own sub-folder.
	if (!subject) {
		return findOrCreateFolder(ownerEmail, signFolderId, subject);
	}
	return signFolderId;
}

async function uploadPdfBytes(
	folderId: string,
	fileName: string,
	pdfBytes: Uint8Array,
	subject: string | undefined,
	makePublic: boolean,
): Promise<DriveUploadResult> {
	const uniqueName = await getUniqueFileName(folderId, fileName, subject);
	const metadata = { name: uniqueName, parents: [folderId] };

	const boundary = "314159265358979323846";
	const delimiter = `--${boundary}\r\n`;
	const closeDelimiter = `\r\n--${boundary}--`;

	const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
	const mediaPartHeader = `${delimiter}Content-Type: application/pdf\r\n\r\n`;

	const multipartBody = Buffer.concat([
		Buffer.from(metadataPart),
		Buffer.from(mediaPartHeader),
		Buffer.from(pdfBytes),
		Buffer.from(closeDelimiter),
	]);

	const uploadResult = await driveRequest<{ id: string }>("/files", {
		method: "POST",
		isUpload: true,
		subject,
		params: { uploadType: "multipart" },
		headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
		rawBody: multipartBody as any,
	});

	const fileId = uploadResult.id;

	if (makePublic) {
		await driveRequest(`/files/${fileId}/permissions`, {
			method: "POST",
			subject,
			body: { role: "reader", type: "anyone" },
		});
	}

	const fileDetails = await driveRequest<{
		id: string;
		name: string;
		webViewLink: string;
		thumbnailLink: string;
	}>(`/files/${fileId}`, {
		subject,
		params: { fields: "id,name,webViewLink,thumbnailLink" },
	});

	return {
		id: fileDetails.id,
		name: fileDetails.name,
		webViewLink: fileDetails.webViewLink,
		thumbnailLink: fileDetails.thumbnailLink || "",
		ownerEmail: subject ?? SUBJECT,
	};
}

/**
 * Upload a signed PDF to the owner's Google Drive via domain-wide delegation.
 * Falls back to the central service account Drive if impersonation fails (e.g.
 * the Drive scope is not yet granted for the service account in Admin console).
 */
export async function uploadSignedPdfToDrive(
	ownerEmail: string,
	fileName: string,
	pdfBytes: Uint8Array,
	options: { makePublic?: boolean } = {},
): Promise<DriveUploadResult> {
	const makePublic = options.makePublic ?? false;
	try {
		const folderId = await getSignatureFolderId(ownerEmail, ownerEmail);
		return await uploadPdfBytes(
			folderId,
			fileName,
			pdfBytes,
			ownerEmail,
			makePublic,
		);
	} catch (error) {
		console.warn(
			`[Drive] Impersonation upload for ${ownerEmail} failed, falling back to central Drive.`,
			error,
		);
		const folderId = await getSignatureFolderId(ownerEmail, undefined);
		return await uploadPdfBytes(
			folderId,
			fileName,
			pdfBytes,
			undefined,
			makePublic,
		);
	}
}

/** Download a Drive file's raw bytes (used to fetch a stored signed PDF). */
export async function downloadDriveFileBytes(
	fileId: string,
	subject?: string,
): Promise<Uint8Array> {
	const token = await getDriveAccessToken(subject);
	const url = new URL(`${DRIVE_BASE}/files/${fileId}`);
	url.searchParams.set("alt", "media");
	const res = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google Drive download error (${res.status}): ${text}`);
	}
	return new Uint8Array(await res.arrayBuffer());
}

/** Toggle public (anyone-with-link reader) access on a signed document. */
export async function setDriveFilePublic(
	fileId: string,
	isPublic: boolean,
	subject?: string,
): Promise<void> {
	if (isPublic) {
		await driveRequest(`/files/${fileId}/permissions`, {
			method: "POST",
			subject,
			body: { role: "reader", type: "anyone" },
		});
		return;
	}
	// Remove the public "anyone" permission if present.
	const list = await driveRequest<{
		permissions: Array<{ id: string; type: string }>;
	}>(`/files/${fileId}/permissions`, {
		subject,
		params: { fields: "permissions(id,type)" },
	});
	const anyone = list.permissions?.find((p) => p.type === "anyone");
	if (anyone) {
		await driveRequest(`/files/${fileId}/permissions/${anyone.id}`, {
			method: "DELETE",
			subject,
		});
	}
}

/**
 * Concatenates multiple Uint8Arrays into one.
 */
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
	const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}
