"use server";

import { getAdminService } from "@/lib/google-api";

/**
 * Update a Google Workspace user.
 *
 * @param userId - The user's primary email or unique id.
 * @param updates - Partial user object containing fields to update.
 * @returns The updated user record from Google.
 */
export async function updateUser(userId: string, updates: any) {
  // Initialize the Admin SDK client with proper scopes.
  const adminService = getAdminService();

  try {
    const response = await adminService.users.update({
      userKey: userId,
      requestBody: updates,
    });
    return response.data;
  } catch (error) {
    console.error("[updateUser] error updating user", userId, error);
    throw error;
  }
}
