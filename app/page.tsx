"use client";

import Image from "next/image";
import { signIn, signOut, useSession } from "@/lib/auth-client";

export default function Home() {
	const { data: session, isPending, error } = useSession();

	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
			<main className="flex w-full max-w-3xl flex-col gap-10 rounded-2xl border border-zinc-200 bg-white px-10 py-12 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Image
							className="dark:invert"
							src="/next.svg"
							alt="Next.js logo"
							width={80}
							height={16}
							priority
						/>
						<span className="text-sm uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
							Better Auth
						</span>
					</div>
					<div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
						Stateless OAuth + Google
					</div>
				</div>

				<div className="space-y-4">
					<h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
						Sign in with Google using Better Auth
					</h1>
					<p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
						Sessions are cached in cookies (no database configured). Use the
						button below to trigger the Google OAuth flow via the Better Auth
						route at
						<span className="font-semibold"> /api/auth</span>.
					</p>
				</div>

				<div className="grid gap-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
								Current session
							</p>
							<p className="text-sm text-zinc-600 dark:text-zinc-400">
								{isPending
									? "Checking session..."
									: session
										? `Signed in as ${session.user.email ?? "unknown"}`
										: "No active session"}
							</p>
							{error ? (
								<p className="text-sm text-red-600">{error.message}</p>
							) : null}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<button
								className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
								onClick={() =>
									signIn.social({ provider: "google", callbackURL: "/" })
								}
							>
								Continue with Google
							</button>
							<button
								className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
								disabled={!session}
								onClick={() => signOut()}
							>
								Sign out
							</button>
						</div>
					</div>

					{session ? (
						<div className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-200">
							<p className="font-medium">Session payload</p>
							<pre className="max-h-48 overflow-auto rounded-lg bg-black/80 px-4 py-3 text-xs text-emerald-100">
								{JSON.stringify(session, null, 2)}
							</pre>
						</div>
					) : null}
				</div>

				<div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
					<span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
						API health: GET /api/auth/ok
					</span>
					<span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
						Base URL: localhost:3000 (dev)
					</span>
					<span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
						Route: app/api/auth/[...all]/route.ts
					</span>
				</div>
			</main>
		</div>
	);
}
