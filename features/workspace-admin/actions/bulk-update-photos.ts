"use server";

import { getAdminService } from "@/lib/google-api";
import { requireUsersAccess } from "./require-users-access";

interface PhotoUpdate {
  userId: string;
  base64Photo: string;
}

export async function bulkUpdatePhotos(updates: PhotoUpdate[]) {
  await requireUsersAccess();
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[bulkUpdatePhotos] error updating photo for ${update.userId}:`,
        message,
      );
      results.push({ userId: update.userId, status: "error", message });
    }
  }

  return results;
}
