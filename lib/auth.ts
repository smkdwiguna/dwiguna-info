import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { isWorkspaceEmail, WORKSPACE_DOMAIN } from "./access";
import {
	fetchUserAccessFromWorkspace,
	fetchUserOUFromWorkspace,
} from "./google-api";

// The Drizzle adapter binds to a D1 instance that is only available within a
// Cloudflare request context, so the auth instance is built lazily. The binding
// is stable per Worker isolate, so caching the instance is safe and avoids
// rebuilding it on every request.
function buildAuth(db: Awaited<ReturnType<typeof getDb>>) {
	return betterAuth({
		secret: process.env.BETTER_AUTH_SECRET ?? "",
		baseURL: process.env.BETTER_AUTH_URL?.replace(/;$/, ""),
		trustedOrigins: [
			process.env.BETTER_AUTH_URL?.replace(/;$/, "") || "http://localhost:3000",
		],
		database: drizzleAdapter(db, {
			provider: "sqlite",
			// Table variables already use Better Auth's default singular names.
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification,
			},
		}),
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID!,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
				hd: WORKSPACE_DOMAIN,
				// Persist a refresh token so the account row stays usable long-term.
				accessType: "offline",
				prompt: "select_account",
				mapProfileToUser: async (profile) => {
					if (!isWorkspaceEmail(profile.email)) {
						throw new Error("Hanya akun smkdwiguna.sch.id yang bisa masuk.");
					}

					const [userOUResult, userAccessResult] = await Promise.allSettled([
						fetchUserOUFromWorkspace(profile.email),
						fetchUserAccessFromWorkspace(profile.email),
					]);

					const userOU =
						userOUResult.status === "fulfilled" ? userOUResult.value : "/";
					const userAccess =
						userAccessResult.status === "fulfilled"
							? userAccessResult.value
							: "";

					return {
						firstName: profile.given_name,
						lastName: profile.family_name,
						ou: userOU,
						access: userAccess,
					};
				},
			},
		},
		user: {
			additionalFields: {
				ou: { type: "string", required: false, input: false },
				access: { type: "string", required: false, input: false },
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24,
		},
		telemetry: {
			enabled: false,
		},
		plugins: [nextCookies()],
	});
}

type Auth = ReturnType<typeof buildAuth>;

let cachedAuth: Auth | null = null;

/** Lazily construct (and cache) the Better Auth instance for this isolate. */
export async function getAuth(): Promise<Auth> {
	if (cachedAuth) return cachedAuth;
	const db = await getDb();
	cachedAuth = buildAuth(db);
	return cachedAuth;
}

export type AuthSession = Awaited<ReturnType<Auth["api"]["getSession"]>>;
