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
		status: "INHERIT",
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
