"use server";

import { requirePermission } from "./require-permission";

export async function requireUsersAccess() {
	const { session } = await requirePermission("users");
	return session;
}
