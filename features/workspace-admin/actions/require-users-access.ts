"use server";

import { requirePermission } from "@/features/access-management/actions/require-permission";

export async function requireUsersAccess() {
	const { session } = await requirePermission("users");
	return session;
}
