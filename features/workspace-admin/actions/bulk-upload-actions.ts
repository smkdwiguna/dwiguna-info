"use server";

import { getAdminService } from "@/lib/google-api";
import {
	fetchAllWorkspaceUsers,
	buildIgnoreList,
	generateUniqueUsername,
} from "@/lib/username-generator";
import { generateRandomPassword } from "@/lib/passwords";
import { requireUsersAccess } from "./require-users-access";

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

const CUSTOM_SCHEMA_FIELDS = [
	"nisn",
	"nis",
	"nuptk",
	"tempatTanggalLahir",
] as const;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Unknown error";
}

async function resolveCustomSchemaName(adminService: ReturnType<typeof getAdminService>) {
	const configuredSchema = process.env.GOOGLE_CUSTOM_SCHEMA_NAME;
	if (configuredSchema) return configuredSchema;

	try {
		const response = await adminService.schemas.list({
			customerId: "my_customer",
		});
		const schemas = response.data.schemas || [];

		let bestMatch: { name: string; matchCount: number } | null = null;

		for (const schema of schemas) {
			const schemaName = schema.schemaName;
			const fieldNames = (schema.fields || [])
				.map((field) => field.fieldName)
				.filter(Boolean) as string[];
			const matchCount = fieldNames.filter((field) =>
				CUSTOM_SCHEMA_FIELDS.includes(field as (typeof CUSTOM_SCHEMA_FIELDS)[number]),
			).length;

			if (schemaName && matchCount > 0) {
				if (!bestMatch || matchCount > bestMatch.matchCount) {
					bestMatch = { name: schemaName, matchCount };
				}
			}
		}

		return bestMatch?.name || null;
	} catch (error) {
		console.error("[resolveCustomSchemaName] error fetching schemas", error);
		return null;
	}
}

export async function generateUserEmailsWithPasswords(
	blocks: GroupBlock[],
): Promise<{ success: boolean; users?: UserWithPassword[]; error?: string }> {
	try {
		await requireUsersAccess();
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
	} catch (error: unknown) {
		console.error("Error generating emails:", error);
		return {
			success: false,
			error: getErrorMessage(error) || "Failed to generate emails",
		};
	}
}

export async function createUsersWithPasswords(
	users: UserWithPassword[],
): Promise<{ success: boolean; created?: number; error?: string }> {
	try {
		await requireUsersAccess();
		const adminService = getAdminService();
		let successCount = 0;
		const hasCustomData = users.some(
			(user) =>
				user.nisn || user.nis || user.nuptk || user.tempatTanggalLahir,
		);
		const customSchemaName = hasCustomData
			? await resolveCustomSchemaName(adminService)
			: null;

		if (hasCustomData && !customSchemaName) {
			throw new Error(
				"Custom schema untuk NIS/NISN/NUPTK/TTL tidak ditemukan. Set GOOGLE_CUSTOM_SCHEMA_NAME atau buat schema di Admin Console.",
			);
		}

		for (const user of users) {
			const nameParts = user.fullName.trim().split(/\s+/);
			const familyName = nameParts.length > 1 ? nameParts.pop() : "-";
			const givenName = nameParts.join(" ") || user.fullName;

			try {
				const customFields: Record<string, string> = {};
				if (user.nisn) customFields.nisn = user.nisn;
				if (user.nis) customFields.nis = user.nis;
				if (user.nuptk) customFields.nuptk = user.nuptk;
				if (user.tempatTanggalLahir)
					customFields.tempatTanggalLahir = user.tempatTanggalLahir;
				const customSchemas =
					customSchemaName && Object.keys(customFields).length > 0
						? { [customSchemaName]: customFields }
						: undefined;

				await adminService.users.insert({
					requestBody: {
						primaryEmail: user.email,
						name: {
							givenName,
							familyName,
						},
						password: user.password,
						changePasswordAtNextLogin: true,
						customSchemas,
					},
				});

				successCount++;
			} catch (error: unknown) {
				console.error(`Failed to create ${user.email}:`, error);
			}
		}

		return {
			success: true,
			created: successCount,
		};
	} catch (error: unknown) {
		console.error("Error creating users:", error);
		return {
			success: false,
			error: getErrorMessage(error) || "Failed to create users",
		};
	}
}
