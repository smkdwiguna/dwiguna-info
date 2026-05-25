"use server";

import { getAdminService } from "@/lib/google-api";
import { getDb } from "@/lib/db";
import { deviceUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUsersAccess } from "./require-users-access";

/**
 * Delete a Google Workspace user and remove them from local devices db.
 *
 * @param userId - The user's primary email or unique id.
 */
export async function deleteUser(userId: string) {
	await requireUsersAccess();
	const adminService = getAdminService();

	try {
		// 1. Delete from Google Workspace
		await adminService.users.delete({
			userKey: userId,
		});

		// 2. Delete from Local Presence Database to sync
		try {
			const db = await getDb();
			await db.delete(deviceUsers).where(eq(deviceUsers.email, userId));
		} catch (dbError) {
			console.error(
				"[deleteUser] error deleting user from local DB",
				userId,
				dbError,
			);
			// We don't throw here because the main action (Google deletion) succeeded
		}

		return { success: true };
	} catch (error) {
		console.error("[deleteUser] error deleting user", userId, error);
		throw error;
	}
}
