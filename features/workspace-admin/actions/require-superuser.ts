"use server";

import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/access";
import { cookies, headers } from "next/headers";

export async function requireSuperUser() {
	const headerStore = await headers();
	const cookieStore = await cookies();
	const requestHeaders = new Headers(headerStore);
	const cookieHeader = cookieStore
		.getAll()
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join("; ");
	if (cookieHeader) {
		requestHeaders.set("cookie", cookieHeader);
	}
	const session = await auth.api.getSession({ headers: requestHeaders });

	if (!session?.user) {
		throw new Error("UNAUTHORIZED");
	}

	if (!isSuperUser(session.user.email)) {
		throw new Error("FORBIDDEN");
	}

	return session;
}
