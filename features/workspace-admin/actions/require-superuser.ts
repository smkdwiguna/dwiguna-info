"use server";

import { getLivePermissions } from "./require-permission";
import { headers } from "next/headers";

async function getAuthDebugContext() {
	const headerStore = await headers();
	return {
		requestId:
			headerStore.get("cf-ray") || headerStore.get("x-request-id") || "unknown",
		host: headerStore.get("host"),
		forwardedHost: headerStore.get("x-forwarded-host"),
		nextUrl: headerStore.get("next-url"),
	};
}

export async function requireSuperUser() {
	const { session, isSuperUser: superUser } = await getLivePermissions();

	if (!session?.user) {
		const debug = await getAuthDebugContext();
		console.error("[auth:requireSuperUser] UNAUTHORIZED", debug);
		throw new Error("UNAUTHORIZED");
	}

	if (!superUser) {
		const debug = await getAuthDebugContext();
		console.error("[auth:requireSuperUser] FORBIDDEN", {
			...debug,
			email: session.user.email,
		});
		throw new Error("FORBIDDEN");
	}

	return session;
}
