"use server";

import { requirePermission } from "./require-permission";

export async function checkUsersAccess() {
	await requirePermission("users");
	return true;
}
