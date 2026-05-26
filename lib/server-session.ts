"use server";

import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";

type ServerSession = {
	user?: {
		email: string;
	};
} | null;

export async function getServerSession(): Promise<ServerSession> {
	const headerStore = await headers();
	const cookieStore = await cookies();

	// Build a clean header with just cookie + host
	const cookieHeader = cookieStore
		.getAll()
		.map((c) => `${c.name}=${c.value}`)
		.join("; ");

	const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
	const proto = headerStore.get("x-forwarded-proto") || "https";

	const cleanHeaders = new Headers({
		cookie: cookieHeader,
		host: host ?? "",
		origin: `${proto}://${host}`,
		"x-forwarded-proto": proto,
		"x-forwarded-host": host ?? "",
	});

	const session = (await auth.api.getSession({
		headers: cleanHeaders,
	})) as ServerSession;

	return session ?? null;
}
