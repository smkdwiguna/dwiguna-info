import { admin, auth } from "@googleapis/admin";

export async function fetchUserOUFromWorkspace(email: string) {
	try {
		const googleAuth = new auth.GoogleAuth({
			credentials: {
				client_email: process.env.GOOGLE_CLIENT_EMAIL,
				private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
			},
			scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
			clientOptions: {
				subject: "proktor@smkdwiguna.sch.id",
			},
		});

		const adminService = admin({ version: "directory_v1", auth: googleAuth });

		const response = await adminService.users.get({
			userKey: email,
			projection: "full",
		});

		return response.data.orgUnitPath || "/";
	} catch (error) {
		console.error("[Google API Error]: ", error);
	}
}
