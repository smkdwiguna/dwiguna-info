import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const appToken = url.searchParams.get("app");
	const pendingCookie = (await cookies()).get("pending_sso_app")?.value;
	let appUrl = "";

	try {
		if (appToken) {
			const decodedReq = jwt.verify(appToken, process.env.SSO_APP_SECRET!) as {
				app_url: string;
			};
			appUrl = decodedReq.app_url;
		} else if (pendingCookie) {
			const decodedCookie = jwt.verify(
				pendingCookie,
				process.env.SSO_APP_SECRET!,
			) as { app_url: string };
			appUrl = decodedCookie.app_url;
		} else {
			return NextResponse.json(
				{ error: "Permintaan login tidak valid/hilang" },
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error("Token verification failed:", error);
		return NextResponse.json(
			{ error: "Akses Ditolak: Tiket Kadaluarsa atau Dimanipulasi" },
			{ status: 403 },
		);
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		const safeCookieValue = jwt.sign(
			{ app_url: appUrl },
			process.env.SSO_APP_SECRET!,
			{ expiresIn: "15m" },
		);
		const response = NextResponse.redirect(new URL("/?sso", request.url));
		response.cookies.set("pending_sso_app", safeCookieValue, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 900,
		});
		return response;
	}

	const privateKey = process.env.SSO_PRIVATE_KEY?.replace(/\\n/g, "\n");
	const ssoToken = jwt.sign(session, privateKey!, {
		algorithm: "RS256",
		expiresIn: "5m",
	});

	const response = NextResponse.redirect(`${appUrl}?token=${ssoToken}`);
	response.cookies.delete("pending_sso_app");
	return response;
}
