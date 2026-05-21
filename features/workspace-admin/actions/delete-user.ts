"use server";

import { getAdminService } from "@/lib/google-api";

/**
 * Delete a Google Workspace user.
 *
 * @param userId - The user's primary email or unique id.
 */
export async function deleteUser(userId: string) {
  const adminService = getAdminService();

  try {
    await adminService.users.delete({
      userKey: userId,
    });
    return { success: true };
  } catch (error) {
    console.error("[deleteUser] error deleting user", userId, error);
    throw error;
  }
}
