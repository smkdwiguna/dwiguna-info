"use server";

import { getAdminService } from "@/lib/google-api";
import { requireUsersAccess } from "./require-users-access";

/**
 * Update a Google Workspace user.
 *
 * @param userId - The user's primary email or unique id.
 * @param updates - Partial user object containing fields to update.
 * @returns The updated user record from Google.
 */
export async function updateUser(
	userId: string,
	updates: Record<string, unknown>,
) {
	await requireUsersAccess();
	const adminService = getAdminService();

	const { customFields, ...rest } = updates as {
		customFields?: Record<string, string | undefined>;
	};

	try {
		let requestBody: Record<string, unknown> = { ...rest };

		if (customFields) {
			const schemaName = process.env.GOOGLE_CUSTOM_SCHEMA_NAME?.trim();
			if (!schemaName) {
				throw new Error(
					"GOOGLE_CUSTOM_SCHEMA_NAME wajib diisi untuk menyimpan custom field.",
				);
			}

			const schemaList = await adminService.schemas.list({
				customerId: "my_customer",
			});
			const schemas = schemaList.data.schemas || [];
			const schemaInfo = schemas.find(
				(schema) => schema.schemaName === schemaName,
			);

			if (!schemaInfo) {
				throw new Error(
					`Custom schema '${schemaName}' tidak ditemukan. Buat schema di Admin Console atau periksa GOOGLE_CUSTOM_SCHEMA_NAME.`,
				);
			}

			const allowedFields = new Set(
				(schemaInfo.fields || [])
					.map((field) => field.fieldName)
					.filter(Boolean) as string[],
			);

			const current = await adminService.users.get({
				userKey: userId,
				projection: "full",
				fields: "customSchemas",
			});
			const existingSchemas = current.data.customSchemas || {};
			const currentSchema =
				(existingSchemas[schemaName] as Record<string, unknown>) ?? {};

			const updatedSchema = { ...currentSchema };
			for (const [field, value] of Object.entries(customFields)) {
				if (!allowedFields.has(field)) continue;
				updatedSchema[field] = value?.trim() || "";
			}

			requestBody = {
				...requestBody,
				customSchemas: {
					...existingSchemas,
					[schemaName]: updatedSchema,
				},
			};
		}

		const response = await adminService.users.update({
			userKey: userId,
			requestBody,
		});
		return response.data;
	} catch (error) {
		console.error("[updateUser] error updating user", userId, error);
		throw error;
	}
}
