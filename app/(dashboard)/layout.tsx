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
					src="/Logo.png"
					alt="Logo SMK TI Dwiguna"
					loading="eager"
					width={195}
					height={195}
					className="h-12 w-12"
				/>
				<Spinner variant="muted" />
			</div>
		);
	}

	if (!session) {
		return <Login />;
	}

	return <AdminLayout userEmail={session.user.email}>{children}</AdminLayout>;
}
