"use server";

import { normalizeAccessList, isSuperUser } from "@/lib/access";
import { fetchUserAccessFromWorkspace } from "@/lib/google-api";
import { getServerSession } from "@/lib/server-session";

type LivePermissionsResult = {
	session: {
		user?: {
			email: string;
		};
	} | null;
	permissions: string[];
	isSuperUser: boolean;
};

export async function getLivePermissions(): Promise<LivePermissionsResult> {
	const session: {
		user?: {
			email: string;
		};
	} | null = await getServerSession();

	if (!session?.user) {
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
		throw new Error("FORBIDDEN");
	}

	return { session, permissions, isSuperUser: false };
}

export async function redirectToDashboardWithFlash(message: string) {
	const { redirect } = await import("next/navigation");
	redirect(`/?flash=${encodeURIComponent(message)}`);
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
		await redirectToDashboardWithFlash(
			"Anda tidak diizinkan membuka halaman ini.",
		);
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
		await redirectToDashboardWithFlash(
			"Anda tidak diizinkan membuka halaman ini.",
		);
	}

	return { session, isSuperUser: superUser };
}