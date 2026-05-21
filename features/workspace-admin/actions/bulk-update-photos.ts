"use server";

import { getAdminService } from "@/lib/google-api";

interface PhotoUpdate {
  userId: string;
  base64Photo: string;
}

export async function bulkUpdatePhotos(updates: PhotoUpdate[]) {
  const adminService = getAdminService();
  const results: { userId: string; status: "success" | "error"; message?: string }[] = [];

  // Process sequentially to avoid rate limits on Google Workspace API
  for (const update of updates) {
    try {
      await adminService.users.photos.update({
        userKey: update.userId,
        requestBody: {
          photoData: update.base64Photo,
        },
      });
      results.push({ userId: update.userId, status: "success" });
    } catch (error: any) {
      console.error(`[bulkUpdatePhotos] error updating photo for ${update.userId}:`, error.message);
      results.push({ userId: update.userId, status: "error", message: error.message });
    }
  }

  return results;
}
