import { consumeAuthorizationCode } from "@/lib/sso-auth-code-store";
import { NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";

function deriveTransferKey(secret: string): Buffer {
	return crypto.createHash("sha256").update(secret).digest();
}

function encryptForClient(
	payload: Record<string, unknown>,
	secret: string,
): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(
		"aes-256-gcm",
		deriveTransferKey(secret),
		iv,
	);
	const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		code?: string;
		appSecret?: string;
	} | null;

	if (!body?.code || !body.appSecret) {
		return NextResponse.json(
			{ error: "code dan appSecret wajib dikirim" },
			{ status: 400 },
		);
	}

	try {
		const decodedSecret = jwt.verify(
			body.appSecret,
			process.env.SSO_PUBLIC_KEY!.replace(/\\n/g, "\n"),
			{
				algorithms: ["RS256"],
				issuer: process.env.BETTER_AUTH_URL!.replace(/\/$/, ""),
			},
		) as jwt.JwtPayload;

		const audience = decodedSecret.aud;
		const audCallback =
			typeof audience === "string"
				? audience
				: Array.isArray(audience)
					? audience[0]
					: undefined;

		if (!audCallback) {
			return NextResponse.json(
				{ error: "aud callback URL tidak ditemukan pada app secret" },
				{ status: 400 },
			);
		}

		const session = consumeAuthorizationCode({
			code: body.code,
			audience: audCallback,
			subject: decodedSecret.sub,
		});

		const encryptedSession = encryptForClient(
			{ userData: session },
			body.appSecret,
		);

		return NextResponse.json({ encryptedSession }, { status: 200 });
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "exchange gagal",
			},
			{ status: 400 },
		);
	}
}
