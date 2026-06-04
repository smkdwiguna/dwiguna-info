"use server";

import { fetchAllWorkspaceUsers } from "@/lib/google-api";
import type { UserOption } from "../components/user-picker";
import { requireCorrespondenceAccess } from "./access";

/**
 * Returns active workspace users as name-first options for the signer picker.
 * Requires correspondence access (feature permission or invited bypass).
 */
export async function listWorkspaceUserOptions(): Promise<UserOption[]> {
	await requireCorrespondenceAccess();

	const users = await fetchAllWorkspaceUsers();
	return users
		.filter((u) => u.primaryEmail && !u.suspended)
		.map((u) => ({
			email: u.primaryEmail as string,
			name: u.name?.fullName || (u.primaryEmail as string),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
