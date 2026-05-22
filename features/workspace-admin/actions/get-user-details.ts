"use server";

import { getAdminService } from "@/lib/google-api";

export async function getUserDetails(userId: string) {
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
