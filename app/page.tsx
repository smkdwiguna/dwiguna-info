"use client";

import { useSession } from "@/lib/auth-client";
import Login from "@/components/login";
import Logout from "@/components/logout";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Spinner } from "@/components/spinner";

export default function HomePage() {
	return (
		<Suspense fallback={<PageLoading />}>
			<HomePageLogic />
		</Suspense>
	);
}

function PageLoading() {
	return (
		<main className="min-h-svh bg-muted/40">
			<div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4">
				<Image
					src="/SMK-TI-Dwiguna.png"
					alt="Logo SMK TI Dwiguna"
					width={1219}
					height={195}
					className="h-12 w-auto"
				/>
				<Spinner variant="muted" />
			</div>
		</main>
	);
}

function HomePageLogic() {
	const { data: session, isPending } = useSession();
	const searchParams = useSearchParams();
	const isSso = searchParams.has("sso");

	if (isPending) {
		return <PageLoading />;
	}

	if (!session) {
		return <Login isSso={isSso} />;
	}

	const { user } = session;

	return (
		<main className="min-h-svh bg-muted/40 p-4 md:p-8">
			<div className="max-w-3xl mx-auto space-y-4">
				<header className="flex items-center justify-between">
					<Image
						src="/SMK-TI-Dwiguna.png"
						alt="Logo SMK TI Dwiguna"
						className="h-12 w-auto max-md:hidden"
						width={1219}
						height={195}
					/>
					<Image
						src="/Logo.png"
						alt="Logo SMK TI Dwiguna"
						className="h-12 w-auto md:hidden"
						width={4060}
						height={4047}
					/>
					<Logout />
				</header>

				<Separator />

				<Card>
					<CardHeader>
						<div className="flex items-start gap-4">
							<Avatar className="size-14">
								<AvatarImage
									referrerPolicy="no-referrer"
									src={user.image ?? undefined}
									alt={user.name}
								/>
								<AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
									{user.name?.charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col pt-0.5">
								<CardTitle className="text-xl font-bold">
									Halo, {user.name}!
								</CardTitle>
								<CardDescription>{user.email}</CardDescription>
							</div>
						</div>
					</CardHeader>
				</Card>
			</div>
		</main>
	);
}
