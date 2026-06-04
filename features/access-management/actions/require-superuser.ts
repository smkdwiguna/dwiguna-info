"use server";

import { redirect } from "next/navigation";
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

export async function redirectToDashboardWithFlash(
	message: string,
): Promise<never> {
	redirect(`/?flash=${encodeURIComponent(message)}`);
}

export async function requireSuperUserOrRedirect() {
	const { session, isSuperUser: superUser } = await getLivePermissions();

	if (!session?.user) {
		redirect("/login");
	}

	if (!superUser) {
		redirect(
			`/?flash=${encodeURIComponent("Anda tidak diizinkan membuka halaman ini.")}`,
		);
	}

	return session;
}
