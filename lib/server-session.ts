"use server";

import { getAuth } from "@/lib/auth";
import { cookies, headers } from "next/headers";

type ServerSession = {
	user?: {
		email: string;
		name?: string | null;
		image?: string | null;
	};
} | null;

export async function getServerSession(): Promise<ServerSession> {
	const headerStore = await headers();
	const cookieStore = await cookies();

	// Build a clean header with just cookie + host so Better Auth can read the
	// session cookie regardless of proxy header quirks on Cloudflare.
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

	const auth = await getAuth();
	const session = (await auth.api.getSession({
		headers: cleanHeaders,
	})) as ServerSession;

	return session ?? auth.api.signOut({ headers: headerStore }).then(() => null);
}
