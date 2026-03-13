import { auth } from "@/lib/auth";
import { createAuthorizationCode } from "@/lib/sso-auth-code-store";
import {
	decryptCookiePayload,
	encryptCookiePayload,
} from "@/lib/secure-cookie";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const pendingCookie = (await cookies()).get("pending_sso_app")?.value;
	let appUrl = "";
	let appSecret = url.searchParams.get("app");

	try {
		if (appSecret) {
			const decodedReq = jwt.verify(
				appSecret,
				process.env.SSO_PUBLIC_KEY!.replace(/\\n/g, "\n"),
				{
					algorithms: ["RS256"],
					issuer: process.env.BETTER_AUTH_URL!.replace(/\/$/, ""),
				},
			) as jwt.JwtPayload;

			const audience = decodedReq.aud;
			const audCallback =
				typeof audience === "string"
					? audience
					: Array.isArray(audience)
						? audience[0]
						: undefined;

			if (!audCallback) {
				throw new Error("aud callback URL tidak ditemukan di app token");
			}

			appUrl = audCallback;
		} else if (pendingCookie) {
			const decodedCookie = decryptCookiePayload<{
				callbackUrl: string;
				appSecret: string;
			}>(pendingCookie);
			appUrl = decodedCookie.callbackUrl;
			appSecret = decodedCookie.appSecret;
		} else {
			return NextResponse.json(
				{ error: "Permintaan login tidak valid" },
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error("Token verification failed:", error);
		return NextResponse.json({ error: "Akses Ditolak" }, { status: 403 });
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		const safeCookieValue = encryptCookiePayload({
			callbackUrl: appUrl,
			appSecret,
		});
		const response = NextResponse.redirect(new URL("/?sso", request.url));
		response.cookies.set("pending_sso_app", safeCookieValue, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 900,
		});
		return response;
	}

	const decodedAppSecret = jwt.decode(appSecret) as jwt.JwtPayload | null;
	const authCode = createAuthorizationCode({
		session: session as unknown as Record<string, unknown>,
		audience: appUrl,
		subject: decodedAppSecret?.sub,
	});

	let callbackUrl: URL;
	try {
		callbackUrl = new URL(appUrl);
	} catch {
		return NextResponse.json(
			{ error: "Callback URL tidak valid di app token" },
			{ status: 400 },
		);
	}

	callbackUrl.searchParams.set("code", authCode);

	const response = NextResponse.redirect(callbackUrl);
	response.cookies.delete("pending_sso_app");
	return response;
}
