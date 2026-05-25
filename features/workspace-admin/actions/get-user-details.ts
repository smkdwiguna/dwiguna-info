"use server";

import { getAdminService } from "@/lib/google-api";
import { requireUsersAccess } from "./require-users-access";

export async function getUserDetails(userId: string) {
	await requireUsersAccess();
	const adminService = getAdminService();

	try {
		const response = await adminService.users.get({
			userKey: userId,
			projection: "full",
		});

		return response.data;
	} catch (error) {
		console.error("[getUserDetails] error fetching user", userId, error);
		throw error;
	}
}
