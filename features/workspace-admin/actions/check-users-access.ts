"use server";

import { requirePermission } from "@/features/access-management/actions/require-permission";

export async function checkUsersAccess() {
	await requirePermission("users");
	return true;
}
