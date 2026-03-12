import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { auth } from "./auth";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";

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
	return jwt.sign(session, process.env.SSO_PRIVATE_KEY!, {
		algorithm: "RS256",
		expiresIn: "5m",
	});
}
