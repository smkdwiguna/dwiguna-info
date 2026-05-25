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

				const [userOU, userAccess] = await Promise.all([
					fetchUserOUFromWorkspace(profile.email),
					fetchUserAccessFromWorkspace(profile.email),
				]);

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
	account: {
		storeAccountCookie: true,
	},
	telemetry: {
		enabled: false,
	},
});

export type AuthSession = typeof auth.$Infer.Session;
