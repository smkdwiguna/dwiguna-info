import { NextRequest, NextResponse } from "next/server";


export async function middleware(request: NextRequest) {
	// Better Auth provides a way to get session from headers in Next.js
	// However, since we're in middleware, we might need to fetch the session endpoint
	// or use a direct cookie check if we only want a basic check.
	// For full security, we fetch the session:
	const response = await fetch(new URL("/api/auth/get-session", request.url), {
		headers: {
			cookie: request.headers.get("cookie") || "",
		},
	});

	if (response.ok) {
		const session = await response.json();
		// We could do global role checks here in the future
		// if (session && session.user) {
		// }
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

