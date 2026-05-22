"use server";

import { getAdminService } from "@/lib/google-api";
import {
	fetchAllWorkspaceUsers,
	buildIgnoreList,
	generateUniqueUsername,
} from "@/lib/username-generator";

interface UserInput {
	fullName: string;
	nisn?: string;
	nis?: string;
	nuptk?: string;
	tempatTanggalLahir?: string;
}

interface UserWithPassword extends UserInput {
	email: string;
	password: string;
	username: string;
}

interface GroupBlock {
	id: string;
	orgUnitPath: string;
	users: UserInput[];
}

function generateRandomPassword(): string {
	const length = 12;
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
	let password = "";
	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return password;
}

export async function generateUserEmailsWithPasswords(
	blocks: GroupBlock[],
): Promise<{ success: boolean; users?: UserWithPassword[]; error?: string }> {
	try {
		const allUsers = await fetchAllWorkspaceUsers();
		const allFullNames = allUsers.map((u) => {
			return typeof u.name?.fullName === "string" ? u.name.fullName : "";
		});
		const ignoreList = buildIgnoreList(allFullNames);

		const existingUsernames = new Set<string>();
		for (const u of allUsers) {
			if (u.primaryEmail && u.primaryEmail.endsWith("@smkdwiguna.sch.id")) {
				const username = u.primaryEmail.split("@")[0];
				existingUsernames.add(username.toLowerCase());
			}
		}

		const usersWithPasswords: UserWithPassword[] = [];

		for (const block of blocks) {
			for (const user of block.users) {
				if (!user.fullName.trim()) continue;

				const username = generateUniqueUsername(
					user.fullName,
					existingUsernames,
					ignoreList,
				);
				const email = `${username}@smkdwiguna.sch.id`;
				const password = generateRandomPassword();

				usersWithPasswords.push({
					...user,
					email,
					password,
					username,
				});

				existingUsernames.add(username.toLowerCase());
			}
		}

		return {
			success: true,
			users: usersWithPasswords,
		};
	} catch (error: any) {
		console.error("Error generating emails:", error);
		return {
			success: false,
			error: error.message || "Failed to generate emails",
		};
	}
}

export async function createUsersWithPasswords(
	users: UserWithPassword[],
): Promise<{ success: boolean; created?: number; error?: string }> {
	try {
		const adminService = getAdminService();
		let successCount = 0;

		for (const user of users) {
			const nameParts = user.fullName.trim().split(/\s+/);
			const familyName = nameParts.length > 1 ? nameParts.pop() : "-";
			const givenName = nameParts.join(" ") || user.fullName;

			try {
				const customSchemas: any = {};

				if (
					user.nisn ||
					user.nis ||
					user.nuptk ||
					user.tempatTanggalLahir
				) {
					customSchemas.akademik = {};
					if (user.nisn) customSchemas.akademik.nisn = user.nisn;
					if (user.nis) customSchemas.akademik.nis = user.nis;
					if (user.nuptk) customSchemas.akademik.nuptk = user.nuptk;
					if (user.tempatTanggalLahir)
						customSchemas.akademik.tempatTanggalLahir = user.tempatTanggalLahir;
				}

				await adminService.users.insert({
					requestBody: {
						primaryEmail: user.email,
						name: {
							givenName,
							familyName,
						},
						password: user.password,
						changePasswordAtNextLogin: true,
						customSchemas:
							Object.keys(customSchemas).length > 0
								? customSchemas
								: undefined,
					},
				});

				successCount++;
			} catch (error: any) {
				console.error(`Failed to create ${user.email}:`, error);
			}
		}

		return {
			success: true,
			created: successCount,
		};
	} catch (error: any) {
		console.error("Error creating users:", error);
		return {
			success: false,
			error: error.message || "Failed to create users",
		};
	}
}
