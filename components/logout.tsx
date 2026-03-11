"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

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
		<button
			onClick={handleLogout}
			className="text-sm cursor-pointer text-red-500 font-medium p-2 bg-red-50 rounded-lg"
		>
			Logout
		</button>
	);
}
