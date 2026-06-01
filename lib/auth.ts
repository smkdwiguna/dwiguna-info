import { betterAuth } from "better-auth/minimal";
import { isWorkspaceEmail, WORKSPACE_DOMAIN } from "./access";
import {
	fetchUserAccessFromWorkspace,
	fetchUserOUFromWorkspace,
} from "./google-api";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL?.replace(/;$/, ""),
	trustedOrigins: [
		process.env.BETTER_AUTH_URL?.replace(/;$/, "") || "http://localhost:3000",
	],
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			hd: WORKSPACE_DOMAIN,
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
					userAccessResult.status === "fulfilled" ? userAccessResult.value : "";

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
			ou: {
				type: "string",
				required: false,
				input: false,
			},
			access: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
	},
	account: {
		storeAccountCookie: true,
	},
	advanced: {
		defaultCookieAttributes: {
			path: "/",
		},
	},
	telemetry: {
		enabled: false,
	},
});

export type AuthSession = typeof auth.$Infer.Session;
