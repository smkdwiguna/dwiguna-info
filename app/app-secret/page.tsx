import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
	CheckCircleIcon,
	WarningCircleIcon,
	KeyIcon,
} from "@phosphor-icons/react/dist/ssr";

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

async function generateAppSecretAction(formData: FormData) {
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
		<main className="min-h-screen bg-muted/40 px-4 py-10">
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="flex items-center gap-3">
					<div className="size-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
						<span className="text-primary-foreground font-bold text-lg leading-none">
							D
						</span>
					</div>
					<div>
						<p className="font-semibold text-sm leading-tight">Dwiguna.Info</p>
						<p className="text-xs text-muted-foreground leading-tight">
							Admin Panel
						</p>
					</div>
				</div>

				<Card>
					<CardHeader className="border-b">
						<div className="flex items-center gap-2">
							<KeyIcon className="size-5 text-primary" weight="duotone" />
							<CardTitle>App Secret Generator</CardTitle>
						</div>
						<CardDescription>
							Generate JWT app secret untuk integrasi aplikasi eksternal dengan
							SSO Dwiguna.Info.
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-6">
						<form
							action={generateAppSecretAction}
							className="flex flex-col gap-5"
						>
							<div className="flex flex-col gap-2">
								<Label htmlFor="sub">sub — Client App Identifier</Label>
								<Input
									id="sub"
									name="sub"
									required
									placeholder="perpus-dwiguna"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="aud">aud — Callback URL</Label>
								<Input
									id="aud"
									name="aud"
									type="url"
									required
									placeholder="http://localhost:3001/auth"
								/>
							</div>

							<Separator />

							<Button type="submit" className="self-start">
								Generate App Secret
							</Button>
						</form>
					</CardContent>
				</Card>

				{params.error && (
					<Alert variant="destructive">
						<WarningCircleIcon className="size-4" />
						<AlertTitle>Terjadi Kesalahan</AlertTitle>
						<AlertDescription>Error: {params.error}</AlertDescription>
					</Alert>
				)}

				{generatedAppKey && (
					<Alert>
						<CheckCircleIcon className="size-4" />
						<AlertTitle>App Secret Berhasil Dibuat</AlertTitle>
						<AlertDescription className="mt-3">
							<textarea
								readOnly
								defaultValue={generatedAppKey}
								rows={8}
								className="w-full rounded-md border bg-background p-3 font-mono text-xs text-foreground resize-none focus:outline-none"
							/>
						</AlertDescription>
					</Alert>
				)}
			</div>
		</main>
	);
}
