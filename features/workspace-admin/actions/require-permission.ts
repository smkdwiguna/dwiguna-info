"use server";

import { normalizeAccessList, isSuperUser } from "@/lib/access";
import { fetchUserAccessFromWorkspace } from "@/lib/google-api";
import { getServerSession } from "@/lib/server-session";
import { headers } from "next/headers";

type LivePermissionsResult = {
	session: {
		user?: {
			email: string;
		};
	} | null;
	permissions: string[];
	isSuperUser: boolean;
};

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

export async function getLivePermissions(): Promise<LivePermissionsResult> {
	const session: {
		user?: {
			email: string;
		};
	} | null = await getServerSession();

	if (!session?.user) {
		const debug = await getAuthDebugContext();
		console.warn("[auth:getLivePermissions] session not found", debug);
		return { session: null, permissions: [], isSuperUser: false };
	}

	if (isSuperUser(session.user.email)) {
		return { session, permissions: [], isSuperUser: true };
	}

	const liveAccess = await fetchUserAccessFromWorkspace(session.user.email);
	return {
		session,
		permissions: normalizeAccessList(liveAccess),
		isSuperUser: false,
	};
}

export async function requirePermission(permission: string) {
	const {
		session,
		permissions,
		isSuperUser: superUser,
	} = await getLivePermissions();

	if (superUser) {
		return { session, permissions, isSuperUser: true };
	}

	if (!permissions.includes(permission)) {
		const debug = await getAuthDebugContext();
		console.warn("[auth:requirePermission] forbidden", {
			...debug,
			email: session?.user?.email || null,
			permission,
			permissions,
		});
		throw new Error("FORBIDDEN");
	}

	return { session, permissions, isSuperUser: false };
}

export async function requirePermissionOrRedirect(permission: string) {
	const {
		session,
		permissions,
		isSuperUser: superUser,
	} = await getLivePermissions();

	if (!session?.user) {
		const debug = await getAuthDebugContext();
		console.warn("[auth:requirePermissionOrRedirect] redirect to /login", {
			...debug,
			permission,
		});
		const { redirect } = await import("next/navigation");
		redirect("/login");
	}

	if (!superUser && !permissions.includes(permission)) {
		const debug = await getAuthDebugContext();
		console.warn("[auth:requirePermissionOrRedirect] redirect to /", {
			...debug,
			email: session?.user?.email || null,
			permission,
			permissions,
		});
		const { redirect } = await import("next/navigation");
		redirect("/");
	}

	return { session, permissions, isSuperUser: superUser };
}

export async function requireSuperUserOrRedirect() {
	const { session, isSuperUser: superUser } = await getLivePermissions();

	if (!session?.user) {
		const debug = await getAuthDebugContext();
		console.warn("[auth:requireSuperUserOrRedirect] redirect to /login", debug);
		const { redirect } = await import("next/navigation");
		redirect("/login");
	}

	if (!superUser) {
		const debug = await getAuthDebugContext();
		console.warn("[auth:requireSuperUserOrRedirect] redirect to /", {
			...debug,
			email: session?.user?.email || null,
		});
		const { redirect } = await import("next/navigation");
		redirect("/");
	}

	return { session, isSuperUser: superUser };
}
