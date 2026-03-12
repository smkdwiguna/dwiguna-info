import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { auth } from "./auth";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export async function getSessionToken() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return null;
	}

	return jwt.sign(session, process.env.SSO_PRIVATE_KEY!.replace(/\\n/g, "\n"), {
		algorithm: "RS256",
		expiresIn: "5m",
		jwtid: crypto.randomUUID(),
		issuer: process.env.BETTER_AUTH_URL!.replace(/\/$/, ""),
		header: {
			alg: "RS256",
			kid: crypto
				.createHash("sha256")
				.update(process.env.SSO_PUBLIC_KEY!.replace(/\\n/g, "\n"))
				.digest("base64url"),
		},
	});
}
