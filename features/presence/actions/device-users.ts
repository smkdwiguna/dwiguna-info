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

export async function enrollFingerprint(fid: number, terminalId: string) {
	const db = await getDb();
	const { terminals } = await import("@/lib/db/schema");
	const terminal = await db.select().from(terminals).where(eq(terminals.id, terminalId)).then((r) => r[0]);
	if (!terminal) throw new Error("Perangkat tidak ditemukan");

	await db
		.update(terminals)
		.set({ 
			status: "2",
			metadata: String(fid) 
		})
		.where(eq(terminals.id, terminalId));
	return { success: true };
}
