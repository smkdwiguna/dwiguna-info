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
			"https://www.googleapis.com/auth/admin.directory.orgunit"
		],
		clientOptions: {
			subject: "proktor@smkdwiguna.sch.id",
		},
	});

	return admin({ version: "directory_v1", auth: googleAuth });
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
