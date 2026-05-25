"use client";

import { useSession } from "@/lib/auth-client";
import { AdminLayout } from "@/features/workspace-admin/components/admin-layout";
import { Spinner } from "@/components/spinner";
import Image from "next/image";
import Login from "@/components/login";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
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
		);
	}

	if (!session) {
		return <Login />;
	}

	return (
		<AdminLayout
			userEmail={session.user.email}
			userAccess={session.user.access}
		>
			{children}
		</AdminLayout>
	);
}
