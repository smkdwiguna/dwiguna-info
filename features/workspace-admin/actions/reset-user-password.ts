"use server";

import { getAdminService } from "@/lib/google-api";
import { generateRandomPassword } from "@/lib/passwords";

export async function resetUserPassword(userId: string) {
	const adminService = getAdminService();
	const password = generateRandomPassword();

	try {
		await adminService.users.update({
			userKey: userId,
			requestBody: {
				password,
				changePasswordAtNextLogin: true,
			},
		});

		return { success: true, password };
	} catch (error) {
		console.error("[resetUserPassword] error resetting password", userId, error);
		throw error;
	}
}
