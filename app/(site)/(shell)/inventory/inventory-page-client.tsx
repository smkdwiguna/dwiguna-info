"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInventories } from "@/features/inventory/actions/inventory";
import {
	InventoryListClient,
	type InventoryRecord,
} from "./inventory-list-client";

export function InventoryPageClient({
	isGlobalAdmin,
	canCreateInventory,
}: {
	isGlobalAdmin: boolean;
	canCreateInventory: boolean;
}) {
	const router = useRouter();
	const [inventories, setInventories] = useState<InventoryRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let active = true;
		setIsLoading(true);

		(async () => {
			try {
				const result = await getInventories();
				if (!active) return;

				setInventories(result);
				if (result.length === 0 && !canCreateInventory) {
					router.replace(
						"/?flash=Anda tidak memiliki akses ke halaman inventaris.",
					);
				}
			} catch (error) {
				console.error("Failed to load inventories", error);
				if (active) {
					setInventories([]);
					router.replace(
						"/?flash=Anda tidak memiliki akses ke halaman inventaris.",
					);
				}
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, [canCreateInventory, router]);

	return (
		<InventoryListClient
			initialInventories={inventories}
			isGlobalAdmin={isGlobalAdmin}
			canCreateInventory={canCreateInventory}
			isLoading={isLoading}
		/>
	);
}
