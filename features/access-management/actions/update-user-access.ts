"use server";

import { getAdminService } from "@/lib/google-api";
import { requireSuperUser } from "./require-superuser";

const ACCESS_FIELD_CANDIDATES = [
	"access",
	"permissions",
	"permission",
] as const;

export async function updateUserAccess(userId: string, accessValue: string) {
	await requireSuperUser();
	const adminService = getAdminService();
	const schemaName = process.env.GOOGLE_CUSTOM_SCHEMA_NAME?.trim();

	if (!schemaName) {
		throw new Error(
			"GOOGLE_CUSTOM_SCHEMA_NAME wajib diisi untuk menyimpan akses.",
		);
	}

	try {
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

		const field = (schemaInfo.fields || [])
			.map((field) => field.fieldName)
			.find(
				(fieldName): fieldName is (typeof ACCESS_FIELD_CANDIDATES)[number] =>
					ACCESS_FIELD_CANDIDATES.includes(
						fieldName as (typeof ACCESS_FIELD_CANDIDATES)[number],
					),
			);

		if (!field) {
			throw new Error(
				`Field access/permissions/permission tidak ditemukan pada schema '${schemaName}'.`,
			);
		}

		const current = await adminService.users.get({
			userKey: userId,
			projection: "full",
			fields: "primaryEmail,id,name,customSchemas",
		});

		const existingSchemas = current.data.customSchemas || {};
		const currentSchema =
			(existingSchemas[schemaName] as Record<string, unknown>) ?? {};

		const merged = {
			...existingSchemas,
			[schemaName]: {
				...currentSchema,
				[field]: accessValue,
			},
		};

		const res = await adminService.users.update({
			userKey: userId,
			requestBody: {
				customSchemas: merged,
			},
		});

		return res.data;
	} catch (error) {
		console.error("[updateUserAccess] error", error);
		throw error;
	}
}
