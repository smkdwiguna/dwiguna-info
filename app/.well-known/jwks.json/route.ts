import { NextResponse } from "next/server";
import crypto from "crypto";

const PUBLIC_CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: PUBLIC_CORS_HEADERS,
	});
}

export async function GET() {
	return NextResponse.json(
		{
			keys: [
				{
					...(crypto
						.createPublicKey(process.env.SSO_PUBLIC_KEY!.replace(/\\n/g, "\n"))
						.export({
							format: "jwk",
						}) as JsonWebKey),
					alg: "RS256",
					use: "sig",
					kid: crypto
						.createHash("sha256")
						.update(process.env.SSO_PUBLIC_KEY!.replace(/\\n/g, "\n"))
						.digest("base64url"),
				},
			],
		},
		{
			headers: {
				"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
				...PUBLIC_CORS_HEADERS,
			},
		},
	);
}
