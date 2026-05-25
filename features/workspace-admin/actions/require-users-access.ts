"use server";

import { auth } from "@/lib/auth";
import { hasPermission, isSuperUser } from "@/lib/access";
import { fetchUserAccessFromWorkspace } from "@/lib/google-api";
import { headers } from "next/headers";

export async function requireUsersAccess() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user) {
		throw new Error("UNAUTHORIZED");
	}

	if (isSuperUser(session.user.email)) {
		return session;
	}

	const liveAccess = await fetchUserAccessFromWorkspace(session.user.email);
	if (!hasPermission(liveAccess, "users")) {
		throw new Error("FORBIDDEN");
	}

	return session;
}
