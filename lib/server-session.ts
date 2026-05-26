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
	const cfRay = headerStore.get("cf-ray");
	const requestId = cfRay || headerStore.get("x-request-id") || "unknown";
	const requestHeaders = new Headers(headerStore);
	const cookieCount = cookieStore.getAll().length;
	const cookieHeader = cookieStore
		.getAll()
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join("; ");
	if (cookieHeader) {
		requestHeaders.set("cookie", cookieHeader);
	}
	const forwardedProto = headerStore.get("x-forwarded-proto") || "http";
	const forwardedHost =
		headerStore.get("x-forwarded-host") || headerStore.get("host");
	const origin =
		headerStore.get("origin") ||
		(forwardedHost ? `${forwardedProto}://${forwardedHost}` : undefined) ||
		process.env.BETTER_AUTH_URL ||
		"http://localhost:3000";
	if (!requestHeaders.get("origin")) {
		requestHeaders.set("origin", origin);
	}

	const query = { disableCookieCache: true };
	const session = (await auth.api.getSession({
		headers: requestHeaders,
		query,
	})) as ServerSession;
	if (session?.user) return session;

	console.warn("[auth:getServerSession] no session from auth.api.getSession", {
		requestId,
		host: headerStore.get("host"),
		forwardedHost,
		forwardedProto,
		origin,
		hasCookieHeader: cookieCount > 0,
		cookieCount,
	});

	try {
		const response = await fetch(new URL("/api/auth/get-session", origin), {
			headers: {
				cookie: cookieHeader,
				origin,
			},
			cache: "no-store",
		});
		if (response.ok) {
			const json = (await response.json()) as ServerSession;
			if (json?.user) return json;
			console.warn(
				"[auth:getServerSession] fallback session endpoint returned no user",
				{
					requestId,
					origin,
				},
			);
		} else {
			console.warn("[auth:getServerSession] fallback session endpoint failed", {
				requestId,
				origin,
				status: response.status,
			});
		}
	} catch (error) {
		console.warn("[auth:getServerSession] fallback fetch failed", {
			requestId,
			origin,
			error,
		});
	}

	return session;
}
