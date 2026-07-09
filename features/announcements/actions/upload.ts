"use server";

import { getServerSession } from "@/lib/server-session";
import { requirePermission } from "@/features/access-management/actions/require-permission";
import { uploadAnnouncementAssetToDrive } from "@/lib/google-drive";

export async function uploadAnnouncementImage(
	formData: FormData,
): Promise<{ url: string }> {
	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Unauthorized");
	}

	await requirePermission("announcement"); // Only those who can create announcements can upload files for it

	const file = formData.get("file") as File | null;
	if (!file) {
		throw new Error("No file uploaded");
	}

	const arrayBuffer = await file.arrayBuffer();

	const uploaded = await uploadAnnouncementAssetToDrive(
		file.name,
		file.type,
		arrayBuffer,
	);

	// Since we set makePublic: true, we can use the webViewLink
	// (or construct a more direct link if needed, but webViewLink usually redirects/renders).
	// A more direct way to view images in Drive is to use the ID:
	const directUrl = `https://drive.google.com/uc?export=view&id=${uploaded.id}`;

	return { url: directUrl };
}
