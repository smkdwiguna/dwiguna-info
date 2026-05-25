"use server";

import { getDb } from "@/lib/db";
import { terminals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTerminal(payload: { id: string; name: string }) {
	const db = await getDb();
	await db.insert(terminals).values({
		id: payload.id,
		name: payload.name,
		status: "0",
	});
	revalidatePath("/presence/terminals");
	return { success: true };
}

export async function updateTerminal(payload: { id: string; name: string; password?: string; status?: string }) {
	const db = await getDb();
	const updateData: any = { name: payload.name };
	if (payload.password !== undefined) updateData.password = payload.password;
	if (payload.status !== undefined) updateData.status = payload.status;
	
	await db.update(terminals).set(updateData).where(eq(terminals.id, payload.id));
	revalidatePath("/presence/terminals");
	return { success: true };
}

export async function deleteTerminal(id: string) {
	const db = await getDb();
	await db.delete(terminals).where(eq(terminals.id, id));
	revalidatePath("/presence/terminals");
	return { success: true };
}

export async function syncAllFingerprints(terminalId: string) {
	const db = await getDb();
	const { deviceUsers } = await import("@/lib/db/schema");
	const users = await db.select().from(deviceUsers).all();

	const fidsWithFingerprints = users.filter((u) => !!u.fingerprint).map((u) => u.id);

	const terminal = await db
		.select()
		.from(terminals)
		.where(eq(terminals.id, terminalId))
		.get();
	if (!terminal) throw new Error("Terminal tidak ditemukan");

	await db
		.update(terminals)
		.set({ syncQueue: JSON.stringify(fidsWithFingerprints) })
		.where(eq(terminals.id, terminalId));

	revalidatePath("/presence/terminals");
	return { success: true, count: fidsWithFingerprints.length };
}
