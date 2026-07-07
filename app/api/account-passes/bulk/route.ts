import JSZip from "jszip";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";
import { fetchAllWorkspaceUsers } from "@/lib/username-generator";
import { isWorkspaceEmail } from "@/lib/access";
import { upsertAccountPassSide } from "@/features/account-passes/actions";
import { uploadPassAssetToDrive } from "@/lib/google-drive";

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
};

type UploadSide = "front" | "back";

type UploadSummary = {
	side: UploadSide;
	files: number;
	matched: number;
	updated: number;
	missingUsers: string[];
};

function normalizeUsernameFromFilename(filename: string) {
	return (
		filename
			.split("/")
			.pop()
			?.replace(/\.[^.]+$/, "")
			.trim()
			.toLowerCase() || ""
	);
}

function inferMimeType(filename: string) {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	return IMAGE_MIME_BY_EXTENSION[ext] || null;
}

async function processZipSide(
	zipFile: File,
	side: UploadSide,
	knownUsers: Map<string, { email: string; displayName: string }>,
): Promise<UploadSummary> {
	const zip = new JSZip();
	const archive = await zip.loadAsync(await zipFile.arrayBuffer());
	const summary: UploadSummary = {
		side,
		files: 0,
		matched: 0,
		updated: 0,
		missingUsers: [],
	};

	for (const [filename, entry] of Object.entries(archive.files)) {
		if (entry.dir) continue;
		const mimeType = inferMimeType(filename);
		if (!mimeType) continue;

		summary.files += 1;
		const username = normalizeUsernameFromFilename(filename);
		if (!username) continue;

		const user = knownUsers.get(username);
		if (!user) {
			summary.missingUsers.push(username);
			continue;
		}

		const bytes = await entry.async("uint8array");
		const buffer = bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		);
		const uploaded = await uploadPassAssetToDrive(
			user.email,
			`${side}-${username}.${filename.split(".").pop() || "jpg"}`,
			mimeType,
			buffer as ArrayBuffer,
		);

		await upsertAccountPassSide({
			ownerEmail: user.email,
			side,
			driveFileId: uploaded.id,
		});

		summary.matched += 1;
		summary.updated += 1;
	}

	return summary;
}

export async function POST(request: Request) {
	const { session, permissions, isSuperUser } = await getLivePermissions();
	if (!session?.user?.email) {
		return Response.json(
			{ success: false, message: "Sesi tidak valid." },
			{ status: 401 },
		);
	}

	if (!isSuperUser && !permissions.includes("users")) {
		return Response.json(
			{ success: false, message: "Anda tidak memiliki akses pengguna." },
			{ status: 403 },
		);
	}

	const formData = await request.formData();
	const frontZip = formData.get("frontZip");
	const backZip = formData.get("backZip");

	if (!(frontZip instanceof File) && !(backZip instanceof File)) {
		return Response.json(
			{
				success: false,
				message: "Minimal satu ZIP depan atau belakang harus dipilih.",
			},
			{ status: 400 },
		);
	}

	const users = await fetchAllWorkspaceUsers();
	const knownUsers = new Map<string, { email: string; displayName: string }>();

	for (const user of users) {
		const email = user.primaryEmail?.toLowerCase().trim();
		if (!email || !isWorkspaceEmail(email)) continue;
		const username = email.split("@")[0];
		knownUsers.set(username, {
			email,
			displayName: user.name?.fullName?.trim() || username,
		});
	}

	const summaries: UploadSummary[] = [];
	if (frontZip instanceof File) {
		summaries.push(await processZipSide(frontZip, "front", knownUsers));
	}
	if (backZip instanceof File) {
		summaries.push(await processZipSide(backZip, "back", knownUsers));
	}

	return Response.json({
		success: true,
		summaries,
	});
}
