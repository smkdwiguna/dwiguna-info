"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminProtectionLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (
			!isPending &&
			session &&
			session.user.email !== "proktor@smkdwiguna.sch.id"
		) {
			router.replace("/");
		}
	}, [session, isPending, router]);

	if (isPending || !session) return null;

	if (session.user.email !== "proktor@smkdwiguna.sch.id") {
		return null; // redirecting
	}

	return <>{children}</>;
}
