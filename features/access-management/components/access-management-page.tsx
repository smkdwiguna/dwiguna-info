"use client";

import { useEffect, useState } from "react";
import { getAccessList } from "@/features/access-management/actions/get-access-list";
import { AccessManagementClient } from "@/features/access-management/components/access-management-client";

type WorkspaceUser = Awaited<ReturnType<typeof getAccessList>>[number];

export function AccessManagementPage() {
	const [users, setUsers] = useState<WorkspaceUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let active = true;
		setIsLoading(true);

		(async () => {
			try {
				const result = await getAccessList();
				if (active) {
					setUsers(result);
				}
			} catch (error) {
				console.error("Failed to load access list", error);
				if (active) {
					setUsers([]);
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
	}, []);

	return <AccessManagementClient users={users} isLoading={isLoading} />;
}
