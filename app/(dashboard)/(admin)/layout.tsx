"use client";

import { hasPermission, isSuperUser } from "@/lib/access";
import { useSession } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminProtectionLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (isPending || !session) return;

		const superUser = isSuperUser(session.user.email);
		const needsUsersPermission =
			pathname.startsWith("/users") || pathname.startsWith("/bulk-upload");
		const canAccessUsers = superUser || hasPermission(session.user.access, "users");
		const canAccess = superUser || (needsUsersPermission && canAccessUsers);

		if (!canAccess) {
			router.replace("/");
		}
	}, [session, isPending, router, pathname]);

	if (isPending || !session) return null;

	const superUser = isSuperUser(session.user.email);
	const needsUsersPermission =
		pathname.startsWith("/users") || pathname.startsWith("/bulk-upload");
	const canAccessUsers = superUser || hasPermission(session.user.access, "users");
	const canAccess = superUser || (needsUsersPermission && canAccessUsers);

	if (!canAccess) {
		return null; // redirecting
	}

	return <>{children}</>;
}
