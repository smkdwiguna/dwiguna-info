import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { oneTap } from "better-auth/plugins";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { isWorkspaceEmail, WORKSPACE_DOMAIN } from "./access";

// The Drizzle adapter binds to the Netlify DB (Neon) connection, built lazily
// per request. Caching the instance per isolate is safe and avoids rebuilding
// it on every request.
function buildAuth(db: Awaited<ReturnType<typeof getDb>>) {
	return betterAuth({
		secret: process.env.BETTER_AUTH_SECRET ?? "",
		baseURL: process.env.BETTER_AUTH_URL?.replace(/;$/, ""),
		trustedOrigins: [
			process.env.BETTER_AUTH_URL?.replace(/;$/, "") || "http://localhost:3000",
		],
		database: drizzleAdapter(db, {
			provider: "pg",
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
				// Keep the cached D1 profile (name + photo) in sync with Google on
				// every sign-in. Workspace stays the source of truth; D1 is only a
				// self-healing cache so stored fields never drift out of date.
				overrideUserInfoOnSignIn: true,
				// Org unit (`ou`) and permissions (`access`) are owned by Google
				// Workspace/Admin and resolved live at request time, so nothing about
				// them is persisted here — we only enforce the workspace domain.
				mapProfileToUser: async (profile) => {
					if (!isWorkspaceEmail(profile.email)) {
						throw new Error("Hanya akun smkdwiguna.sch.id yang bisa masuk.");
					}
					return {};
				},
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24,
		},
		telemetry: {
			enabled: false,
		},
		// One Tap signs in returning users instantly. Signup stays on the full
		// OAuth flow so the workspace-domain check (hd) and Drive refresh token
		// continue to be enforced/captured there.
		plugins: [oneTap({ disableSignup: true }), nextCookies()],
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
