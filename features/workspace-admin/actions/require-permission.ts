"use server";

import { normalizeAccessList, isSuperUser } from "@/lib/access";
import { fetchUserAccessFromWorkspace } from "@/lib/google-api";
import { getServerSession } from "@/lib/server-session";

export async function getLivePermissions() {
	const session = await getServerSession();

	if (!session?.user) {
		throw new Error("UNAUTHORIZED");
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
		const { redirect } = await import("next/navigation");
		redirect("/login");
	}

	if (!superUser && !permissions.includes(permission)) {
		const { redirect } = await import("next/navigation");
		console.log(permissions);
		redirect("/");
	}

	return { session, permissions, isSuperUser: superUser };
}

export async function requireSuperUserOrRedirect() {
	const { session, isSuperUser: superUser } = await getLivePermissions();

	if (!session?.user) {
		const { redirect } = await import("next/navigation");
		redirect("/login");
	}

	if (!superUser) {
		const { redirect } = await import("next/navigation");
		redirect("/");
	}

	return { session, isSuperUser: superUser };
}
