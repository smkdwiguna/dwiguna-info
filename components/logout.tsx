"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignOutIcon } from "@phosphor-icons/react";

export default function Logout() {
	const router = useRouter();
	const handleLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.push("/");
				},
			},
		});
	};

	return (
		<Button variant="destructive" onClick={handleLogout}>
			<SignOutIcon data-icon="inline-start" weight="bold" />
			<span className="max-md:hidden">Logout</span>
		</Button>
	);
}
