import { betterAuth } from "better-auth/minimal";

const baseURL =
	process.env.BETTER_AUTH_URL ||
	(process.env.NODE_ENV === "development"
		? "http://localhost:3000"
		: undefined);

export const auth = betterAuth({
	baseURL,
	trustedOrigins: ["http://localhost:3000", "https://dwiguna.info"],
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		},
	},
	account: {
		// Store OAuth account data in cookies since we're running stateless
		storeAccountCookie: true,
	},
	telemetry: {
		enabled: false,
	},
});

export type AuthSession = typeof auth.$Infer.Session;
