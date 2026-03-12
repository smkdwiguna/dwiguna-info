import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const PROKTOR_EMAIL = "proktor@smkdwiguna.sch.id";
const FLASH_COOKIE = "generated_app_key";

type GenerateSearchParams = {
	generated?: string;
	error?: string;
};

async function checkAccess() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || session.user.email !== PROKTOR_EMAIL) {
		return redirect("/");
	}

	return session;
}

async function generateAppKeyAction(formData: FormData) {
	"use server";

	await checkAccess();

	const sub = String(formData.get("sub") ?? "").trim();
	const aud = String(formData.get("aud") ?? "").trim();

	if (!sub || !aud) {
		redirect("/app-secret?error=input_wajib");
	}

	let normalizedAud: URL;
	try {
		normalizedAud = new URL(aud);
	} catch {
		redirect("/app-secret?error=aud_invalid");
	}

	const appKey = jwt.sign(
		{},
		process.env.SSO_PRIVATE_KEY!.replace(/\\n/g, "\n"),
		{
			algorithm: "RS256",
			subject: sub,
			audience: normalizedAud.toString(),
			expiresIn: "365d",
			jwtid: crypto.randomUUID(),
			issuer: process.env.BETTER_AUTH_URL!.replace(/\/$/, ""),
			header: {
				alg: "RS256",
				kid: crypto
					.createHash("sha256")
					.update(process.env.SSO_PUBLIC_KEY!.replace(/\\n/g, "\n"))
					.digest("base64url"),
			},
		},
	);

	const cookieStore = await cookies();
	cookieStore.set(FLASH_COOKIE, appKey, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/app-secret",
		maxAge: 60 * 10,
	});

	redirect("/app-secret?generated");
}

export default async function AdminGenerateKeyPage({
	searchParams,
}: {
	searchParams: Promise<GenerateSearchParams>;
}) {
	await checkAccess();
	const params = await searchParams;
	const cookieStore = await cookies();
	const generatedAppKey =
		params.generated != null ? cookieStore.get(FLASH_COOKIE)?.value : null;

	return (
		<main className="min-h-screen bg-zinc-50 px-4 py-10 font-sans">
			<div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
				<h1 className="text-2xl font-bold text-zinc-900">
					App Secret Generator
				</h1>

				<form action={generateAppKeyAction} className="mt-8 space-y-4">
					<div>
						<label
							htmlFor="sub"
							className="mb-1 block text-sm font-medium text-zinc-700"
						>
							sub (Client App Identifier)
						</label>
						<input
							id="sub"
							name="sub"
							required
							placeholder="perpus-dwiguna"
							className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-500"
						/>
					</div>

					<div>
						<label
							htmlFor="aud"
							className="mb-1 block text-sm font-medium text-zinc-700"
						>
							aud (Callback URL)
						</label>
						<input
							id="aud"
							name="aud"
							type="url"
							required
							placeholder="http://localhost:3001/auth"
							className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-500"
						/>
					</div>

					<button
						type="submit"
						className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
					>
						Generate
					</button>
				</form>

				{params.error ? (
					<p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						Error: {params.error}
					</p>
				) : null}

				{generatedAppKey ? (
					<div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
						<p className="text-sm font-semibold text-emerald-700">
							App Secret berhasil dibuat
						</p>
						<textarea
							readOnly
							value={generatedAppKey}
							rows={8}
							className="mt-3 w-full rounded-md border border-emerald-200 bg-white p-3 font-mono text-xs text-zinc-800"
						/>
					</div>
				) : null}
			</div>
		</main>
	);
}
