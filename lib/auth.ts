import { betterAuth } from "better-auth/minimal";
import { isWorkspaceEmail, WORKSPACE_DOMAIN } from "./access";
import {
	fetchUserAccessFromWorkspace,
	fetchUserOUFromWorkspace,
} from "./google-api";

const PRODUCTION_ORIGINS = [
	"https://dwiguna.info",
	"https://www.dwiguna.info",
	"http://localhost:3000",
];

const configuredBaseURL = process.env.BETTER_AUTH_URL?.replace(/;$/, "");

const trustedOrigins = Array.from(
	new Set([configuredBaseURL, ...PRODUCTION_ORIGINS].filter(Boolean)),
);

export const auth = betterAuth({
	baseURL: configuredBaseURL,
	trustedOrigins,
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
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
			domain: "dwiguna.info",
		},
		defaultCookieAttributes: {
			path: "/",
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
