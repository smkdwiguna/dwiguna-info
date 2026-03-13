"use client";

import { useSession } from "@/lib/auth-client";
import Login from "@/components/login";
import Logout from "@/components/logout";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Perpus from "@/components/perpus";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

export default function HomePage() {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<HomePageLogic />
		</Suspense>
	);
}

function PageSkeleton() {
	return (
		<main className="min-h-screen bg-muted/40 p-4 md:p-8">
			<div className="max-w-3xl mx-auto space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-8 w-20" />
				</div>
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		</main>
	);
}

function HomePageLogic() {
	const { data: session, isPending } = useSession();
	const searchParams = useSearchParams();
	const isSso = searchParams.has("sso");

	if (isPending) {
		return <PageSkeleton />;
	}

	if (!session) {
		return <Login isSso={isSso} />;
	}

	const { user } = session;

	return (
		<main className="min-h-screen bg-muted/40 p-4 md:p-8">
			<div className="max-w-3xl mx-auto space-y-6">
				<header className="flex items-center justify-between">
					<Image
						src="/SMK-TI-Dwiguna.png"
						alt="Logo SMK TI Dwiguna"
						className="h-8 w-auto"
						width={1219}
						height={195}
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

				<Perpus />
			</div>
		</main>
	);
}
