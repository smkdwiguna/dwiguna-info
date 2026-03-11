"use client";

import { useSession } from "@/lib/auth-client";
import Login from "@/components/login";
import Logout from "@/components/logout";
import { useSearchParams } from "next/navigation";

export default function HomePage() {
	const { data: session, isPending } = useSession();
	const searchParams = useSearchParams();
	const isSso = searchParams.has("sso");

	if (isPending) {
		return <main className="min-h-screen bg-zinc-50 p-4 font-sans" />;
	}

	if (!session) {
		return (
			<main className="min-h-screen bg-zinc-50 p-4 font-sans">
				<Login isSso={isSso} />
			</main>
		);
	}

	const { user } = session;
	const userOu = (user as { ou?: string }).ou;

	return (
		<main className="min-h-screen bg-zinc-50 p-4 md:p-8 font-sans">
			<div className="max-w-4xl mx-auto space-y-6">
				<header className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-2xl font-bold text-zinc-900">
							Halo, {user.name} 👋
						</h1>
						<p className="text-sm text-zinc-500">
							SMK TI Dwiguna • {userOu ?? "-"}
						</p>
					</div>
					<Logout />
				</header>

				<div className="p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm">
					<h2 className="text-lg font-semibold text-zinc-800">
						Selamat datang di Dwiguna Center
					</h2>
					<p className="text-zinc-500 mt-2">
						Ini adalah halaman utama (Dashboard) karena kamu sudah login.
					</p>
				</div>
			</div>
		</main>
	);
}
