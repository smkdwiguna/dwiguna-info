import { admin, auth } from "@googleapis/admin";

export function getAdminService() {
	const googleAuth = new auth.GoogleAuth({
		credentials: {
			client_email: process.env.GOOGLE_CLIENT_EMAIL,
			private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
		},
		scopes: [
			"https://www.googleapis.com/auth/admin.directory.user",
			"https://www.googleapis.com/auth/admin.directory.group",
			"https://www.googleapis.com/auth/admin.directory.orgunit",
			"https://www.googleapis.com/auth/admin.directory.userschema",
		],
		clientOptions: {
			subject: "proktor@smkdwiguna.sch.id",
		},
	});

	return admin({ version: "directory_v1", auth: googleAuth });
}

export async function fetchAllOrgUnits() {
	try {
		const adminService = getAdminService();
		const response = await adminService.orgunits.list({
			customerId: "my_customer",
			type: "all",
		});
		return (response.data.organizationUnits || []).map(
			(ou) => ou.orgUnitPath || "/",
		);
	} catch (error) {
		console.error("[Google API Error - fetchAllOrgUnits]: ", error);
		return [];
	}
}

export async function fetchUserOUFromWorkspace(email: string) {
	try {
		const adminService = getAdminService();

		const response = await adminService.users.get({
			userKey: email,
			projection: "full",
		});

		return response.data.orgUnitPath || "/";
	} catch (error) {
		console.error("[Google API Error]: ", error);
	}
}

function normalizeCustomSchemaValue(value: unknown): string {
	if (typeof value === "string") return value.trim();
	if (Array.isArray(value)) {
		return value
			.map((item) => (typeof item === "string" ? item.trim() : ""))
			.filter(Boolean)
			.join(",");
	}
	if (!value || typeof value !== "object") return "";

	const record = value as { value?: unknown };
	return normalizeCustomSchemaValue(record.value);
}

export async function fetchUserAccessFromWorkspace(email: string) {
	try {
		const adminService = getAdminService();
		const response = await adminService.users.get({
			userKey: email,
			projection: "full",
		});

		const customSchemas = response.data.customSchemas;
		if (!customSchemas || typeof customSchemas !== "object") return "";

		const candidateSchemaNames = new Set([
			process.env.GOOGLE_ACCESS_SCHEMA_NAME?.trim(),
			"access",
			"accessManagement",
			"access-management",
			"dwiguna",
		]);

		for (const [schemaName, schemaValue] of Object.entries(customSchemas)) {
			if (!candidateSchemaNames.has(schemaName)) continue;
			if (!schemaValue || typeof schemaValue !== "object") continue;

			const fields = schemaValue as Record<string, unknown>;
			const fieldValue =
				normalizeCustomSchemaValue(fields.access) ||
				normalizeCustomSchemaValue(fields.permissions) ||
				normalizeCustomSchemaValue(fields.permission);

			if (fieldValue) return fieldValue;
		}

		for (const schemaValue of Object.values(customSchemas)) {
			if (!schemaValue || typeof schemaValue !== "object") continue;

			const fields = schemaValue as Record<string, unknown>;
			const fieldValue =
				normalizeCustomSchemaValue(fields.access) ||
				normalizeCustomSchemaValue(fields.permissions) ||
				normalizeCustomSchemaValue(fields.permission);

			if (fieldValue) return fieldValue;
		}

		return "";
	} catch (error) {
		console.error("[Google API Error - fetchUserAccessFromWorkspace]: ", error);
		return "";
	}
}
