import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session-token";

export async function GET() {
	const token = await getSessionToken();
	if (!token) {
		return NextResponse.json(
			{
				ok: false,
				error: "Belum login di Dwiguna.Info",
			},
			{ status: 401 },
		);
	}

	const exampleApiUrl =
		process.env.EXAMPLE_DATA_API_URL ?? "http://localhost:3001/api/test";

	try {
		const response = await fetch(exampleApiUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
			cache: "no-store",
		});

		const data = await response.json();

		return NextResponse.json(
			{
				token,
				data,
			},
			{ status: response.ok ? 200 : response.status },
		);
	} catch (error) {
		return NextResponse.json(
			{
				token,
				error: "Gagal menghubungi Example API",
				detail: error instanceof Error ? error.message : "unknown",
			},
			{ status: 502 },
		);
	}
}
