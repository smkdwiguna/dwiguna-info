"use server";

import { getDb } from "@/lib/db";
import { deviceUsers } from "@/lib/db/schema";
import { fetchAllWorkspaceUsers } from "@/lib/username-generator";

/**
 * Checks a list of emails and assigns an ID from 0 to 999
 * for any email that doesn't already have one in the database.
 */
export async function assignMissingDeviceIds(targetOrgUnitPath: string) {
	// 1. Fetch all users from Workspace to find who is in the target org unit
	const allWorkspaceUsers = await fetchAllWorkspaceUsers();
	const targetUsers = allWorkspaceUsers.filter(
		(u) => u.orgUnitPath === targetOrgUnitPath && u.primaryEmail
	);

	if (targetUsers.length === 0) {
		return { success: true, newAssignments: 0 };
	}

	const targetEmails = targetUsers.map((u) => u.primaryEmail!);

	// 2. Fetch existing device users from DB
	const db = await getDb();
	const existingUsers = await db.select().from(deviceUsers);

	const existingEmails = new Set(existingUsers.map((u) => u.email));
	const takenIds = new Set(existingUsers.map((u) => u.id));

	// 3. Find which target emails need an ID
	const emailsNeedingId = targetEmails.filter((email) => !existingEmails.has(email));

	if (emailsNeedingId.length === 0) {
		return { success: true, newAssignments: 0 };
	}

	// 4. Generate available IDs from 0 to 999
	const availableIds: number[] = [];
	for (let i = 0; i <= 999; i++) {
		if (!takenIds.has(i)) {
			availableIds.push(i);
		}
	}

	if (availableIds.length < emailsNeedingId.length) {
		throw new Error(
			`Not enough available Device IDs. Need ${emailsNeedingId.length}, but only ${availableIds.length} left between 0 and 999.`
		);
	}

	// 5. Assign and insert new users
	const insertPayload = emailsNeedingId.map((email, index) => ({
		id: availableIds[index],
		email: email,
	}));

	await db.insert(deviceUsers).values(insertPayload);

	return {
		success: true,
		newAssignments: insertPayload.length,
	};
}
