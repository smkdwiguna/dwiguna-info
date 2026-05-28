"use server";

import { fetchAllWorkspaceUsers } from "@/lib/username-generator";
import { requireSuperUser } from "./require-superuser";

export async function getAccessList() {
	await requireSuperUser();
	const allUsers = await fetchAllWorkspaceUsers();

	return (allUsers || []).map((u: any) => ({
		id: u.id,
		primaryEmail: u.primaryEmail,
		fullName: u.name?.fullName || null,
		orgUnitPath: u.orgUnitPath || null,
		suspended: !!u.suspended,
		thumbnailPhotoUrl: u.thumbnailPhotoUrl || null,
		customSchemas: u.customSchemas || null,
	}));
}
