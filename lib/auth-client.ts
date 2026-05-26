"use client";

import { createAuthClient } from "better-auth/react";

const authBaseURL =
	typeof window !== "undefined"
		? window.location.origin
		: process.env.BETTER_AUTH_URL?.replace(/;$/, "") || "http://localhost:3000";

export const authClient = createAuthClient({
	baseURL: authBaseURL,
});

export const { signIn, signOut, useSession, getSession } = authClient;
