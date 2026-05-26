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
	const allCookies = cookieStore.getAll();
	const cookieCount = allCookies.length;
	const cookieNames = allCookies.map((cookie) => cookie.name);
	const betterAuthCookieNames = cookieNames.filter((name) =>
		name.toLowerCase().includes("better-auth"),
	);
	const cookieHeader = allCookies
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join("; ");
	const forwardedProto = headerStore.get("x-forwarded-proto") || "http";
	const forwardedHost =
		headerStore.get("x-forwarded-host") || headerStore.get("host");
	const origin =
		headerStore.get("origin") ||
		(forwardedHost ? `${forwardedProto}://${forwardedHost}` : undefined) ||
		process.env.BETTER_AUTH_URL ||
		"http://localhost:3000";
	const minimalCookieHeaders = cookieHeader ? new Headers({ cookie: cookieHeader }) : undefined;

	const query = { disableCookieCache: true };
	const session = (await auth.api.getSession({
		headers: minimalCookieHeaders || headerStore,
		query,
	})) as ServerSession;
	if (session?.user) return session;

	if (minimalCookieHeaders) {
		const minimalSession = (await auth.api.getSession({
			headers: minimalCookieHeaders,
			query,
		})) as ServerSession;
		if (minimalSession?.user) {
			console.warn("[auth:getServerSession] session recovered with cookie-only headers", {
				requestId,
				host: headerStore.get("host"),
				forwardedHost,
				forwardedProto,
				origin,
				cookieCount,
				betterAuthCookieNames,
			});
			return minimalSession;
		}
	}

	console.warn("[auth:getServerSession] no session from auth.api.getSession", {
		requestId,
		host: headerStore.get("host"),
		forwardedHost,
		forwardedProto,
		origin,
		hasCookieHeader: cookieCount > 0,
		cookieCount,
		cookieNames,
		betterAuthCookieNames,
		betterAuthUrl: process.env.BETTER_AUTH_URL || null,
	});

	return session;
}
