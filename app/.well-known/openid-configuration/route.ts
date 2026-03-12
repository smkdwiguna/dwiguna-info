import { NextResponse } from "next/server";

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
			issuer: process.env.BETTER_AUTH_URL?.replace(/\/$/, ""),
			jwks_uri: `${process.env.BETTER_AUTH_URL?.replace(/\/$/, "")}/.well-known/jwks.json`,
			id_token_signing_alg_values_supported: ["RS256"],
		},
		{
			headers: {
				"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
				...PUBLIC_CORS_HEADERS,
			},
		},
	);
}
