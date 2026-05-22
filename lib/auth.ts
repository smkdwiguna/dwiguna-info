import { betterAuth } from "better-auth/minimal";
import { fetchUserOUFromWorkspace } from "./google-api";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL?.replace(/;$/, ""),
	trustedOrigins: [
		process.env.BETTER_AUTH_URL?.replace(/;$/, "") || "http://localhost:3000",
	],
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			mapProfileToUser: async (profile) => {
				const userOU = await fetchUserOUFromWorkspace(profile.email);
				return {
					firstName: profile.given_name,
					lastName: profile.family_name,
					ou: userOU,
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
