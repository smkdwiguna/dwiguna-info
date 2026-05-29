"use server";

import { getLivePermissions } from "./require-permission";

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

export async function requireSuperUserOrRedirect() {
	try {
		return await requireSuperUser();
	} catch (error) {
		console.error("[requireSuperUserOrRedirect] error", error);
		redirectToDashboardWithFlash("Anda tidak diizinkan membuka halaman ini.");
	}
}

export async function redirectToDashboardWithFlash(message: string) {
	const searchParams = new URLSearchParams({ flash: message });
	const url = `/dashboard?${searchParams.toString()}`;
	if (typeof window !== "undefined") window.location.href = url;
}
