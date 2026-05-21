"use server";

import { GroupBlock } from "../components/bulk-upload-client";
import { getAdminService } from "@/lib/google-api";
import {
	fetchAllWorkspaceUsers,
	buildIgnoreList,
	generateUniqueUsername,
} from "@/lib/username-generator";

export async function processBulkUpload(blocks: GroupBlock[]) {
	// 1. Fetch all users for username collision check and ignore list
	const allUsers = await fetchAllWorkspaceUsers();

	const allFullNames = allUsers.map((u) => {
		return typeof u.name?.fullName === "string" ? u.name.fullName : "";
	});

	const ignoreList = buildIgnoreList(allFullNames);

	// Create a set of existing usernames (the part before @smkdwiguna.sch.id)
	const existingUsernames = new Set<string>();
	for (const u of allUsers) {
		if (u.primaryEmail && u.primaryEmail.endsWith("@smkdwiguna.sch.id")) {
			const username = u.primaryEmail.split("@")[0];
			existingUsernames.add(username.toLowerCase());
		}
	}

	const adminService = getAdminService();
	const results = [];

	for (const block of blocks) {
		const orgUnitPath = block.orgUnitPath || "/";

		for (const user of block.users) {
			const username = generateUniqueUsername(
				user.fullName,
				existingUsernames,
				ignoreList,
			);
			const primaryEmail = `${username}@smkdwiguna.sch.id`;

			// Try to split name into Given and Family name for Google Workspace requirement
			const nameParts = user.fullName.trim().split(/\s+/);
			const familyName = nameParts.length > 1 ? nameParts.pop() : "-";
			const givenName = nameParts.join(" ") || user.fullName;

			try {
				// 1. Create User
				await adminService.users.insert({
					requestBody: {
						primaryEmail,
						name: {
							givenName,
							familyName,
						},
						orgUnitPath,
						password: "ChangeMe123!", // default password
						changePasswordAtNextLogin: true,
					},
				});

				results.push({
					fullName: user.fullName,
					email: primaryEmail,
					status: "success",
				});
			} catch (error: any) {
				console.error(`Failed to process ${user.fullName}:`, error);
				results.push({
					fullName: user.fullName,
					email: primaryEmail,
					status: "error",
					message: error.message,
				});
			}
		}
	}

	return {
		success: true,
		results,
	};
}
