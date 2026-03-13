"use client";

import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
	BooksIcon,
	ArrowUpRightIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";

export default function Example() {
	const { data: session } = useSession();
	const [data, setData] = useState<unknown>(null);
	const [token, setToken] = useState<unknown>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const loadExampleData = async () => {
			if (!session) {
				setData(null);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/example", {
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

		void loadExampleData();
	}, [session]);

	if (!session) return null;

	return (
		<Card>
			<CardHeader className="border-b">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<BooksIcon className="size-5 text-primary" weight="duotone" />
						<CardTitle>Example Integration</CardTitle>
					</div>
					<Button asChild variant="default" size="icon">
						<Link
							href={"http://localhost:3001/auth?token=" + String(token)}
							target="_blank"
						>
							<ArrowUpRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{isLoading ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</div>
				) : error ? (
					<Alert variant="destructive">
						<WarningCircleIcon className="size-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : (
					<>
						<pre className="bg-muted rounded-lg p-4 text-xs text-foreground overflow-auto max-h-48 font-mono">
							{JSON.stringify(data, null, 2)}
						</pre>
					</>
				)}
			</CardContent>
		</Card>
	);
}
