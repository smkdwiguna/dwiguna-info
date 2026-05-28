"use server";

import { getLivePermissions } from "@/features/workspace-admin/actions/require-permission";

export async function requireSuperUser() {
	const { session, isSuperUser: superUser } = await getLivePermissions();

	if (!session?.user) {
		throw new Error("UNAUTHORIZED");
	}

	if (!superUser) {
		throw new Error("FORBIDDEN");
	}

	return session;
}
