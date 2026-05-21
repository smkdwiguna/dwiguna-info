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
		const orgUnitPath = `/Siswa/${block.entryYear}`;
		const groupEmail = `${block.className.toLowerCase().replace(/[^a-z0-9-]/g, "")}@smkdwiguna.sch.id`;

		// Ensure Group exists (Optional but robust)
		try {
			await adminService.groups.get({ groupKey: groupEmail });
		} catch (error: any) {
			if (error.code === 404) {
				try {
					await adminService.groups.insert({
						requestBody: {
							email: groupEmail,
							name: `Kelas ${block.className} (${block.entryYear})`,
						},
					});
				} catch (groupCreateErr) {
					console.error(`Failed to create group ${groupEmail}:`, groupCreateErr);
				}
			}
		}

		for (const student of block.students) {
			const username = generateUniqueUsername(student.fullName, existingUsernames, ignoreList);
			const primaryEmail = `${username}@smkdwiguna.sch.id`;
			
			// Try to split name into Given and Family name for Google Workspace requirement
			const nameParts = student.fullName.trim().split(/\s+/);
			const familyName = nameParts.length > 1 ? nameParts.pop() : "-";
			const givenName = nameParts.join(" ") || student.fullName;

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

				// 2. Add to Group
				await adminService.members.insert({
					groupKey: groupEmail,
					requestBody: {
						email: primaryEmail,
						role: "MEMBER",
					},
				});

				results.push({
					fullName: student.fullName,
					email: primaryEmail,
					status: "success",
				});
			} catch (error: any) {
				console.error(`Failed to process ${student.fullName}:`, error);
				results.push({
					fullName: student.fullName,
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
