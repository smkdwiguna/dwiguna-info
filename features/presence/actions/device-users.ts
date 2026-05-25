"use server";

import { getDb } from "@/lib/db";
import { deviceUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteDeviceUser(id: number) {
	const db = await getDb();
	await db.delete(deviceUsers).where(eq(deviceUsers.id, id));
	revalidatePath("/presence/device-users");
	return { success: true };
}
