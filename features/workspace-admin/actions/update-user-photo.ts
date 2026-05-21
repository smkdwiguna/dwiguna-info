"use server";

import { getAdminService } from "@/lib/google-api";

/**
 * Update a Google Workspace user's profile photo.
 *
 * @param userId - The user's primary email or unique id.
 * @param base64Photo - The image data in web-safe Base64 format.
 */
export async function updateUserPhoto(userId: string, base64Photo: string) {
  const adminService = getAdminService();

  try {
    await adminService.users.photos.update({
      userKey: userId,
      requestBody: {
        photoData: base64Photo,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[updateUserPhoto] error updating user photo", userId, error);
    throw error;
  }
}
