"use client";

import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Perpus() {
	const { data: session } = useSession();
	const [data, setData] = useState<unknown>(null);
	const [token, setToken] = useState<unknown>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const loadPerpusData = async () => {
			if (!session) {
				setData(null);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/perpus", {
					cache: "no-store",
				});
				const payload = (await response.json()) as {
					error?: string;
					data?: unknown;
					token?: string;
				};

				if (!response.ok) {
					setError(payload?.error ?? "Gagal mengambil data data");
					setData(null);
					return;
				}

				setData(payload?.data ?? null);
				setToken(payload?.token ?? null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
				setData(null);
			} finally {
				setIsLoading(false);
			}
		};

		void loadPerpusData();
	}, [session]);

	if (!session || isLoading) {
		return null;
	}

	return (
		<div className="p-6 rounded-3xl border border-zinc-100 shadow-sm">
			<Link
				href={"http://localhost:3001/auth?token=" + token}
				target="_blank"
				className="underline"
			>
				<h2 className="text-lg font-semibold text-zinc-800">Perpus</h2>
			</Link>
			{error ? <p className="text-sm text-red-500">{error}</p> : null}
			<code className="block text-white whitespace-pre-wrap bg-black p-4 rounded-lg text-left text-sm mt-4">
				{JSON.stringify(data, null, 2)}
			</code>
		</div>
	);
}
