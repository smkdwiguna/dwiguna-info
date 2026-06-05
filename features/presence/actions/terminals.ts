"use server";

import { getDb } from "@/lib/db";
import { terminals } from "@/lib/db/schema";
import {
	generateTerminalPassword,
	isTerminalPasswordValid,
} from "@/lib/terminal-secret";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTerminal(payload: {
	id: string;
	name: string;
	password: string;
}) {
	const id = payload.id.trim();
	const name = payload.name.trim();
	const password = payload.password.trim();

	if (!id || !name) {
		throw new Error("ID dan nama harus diisi.");
	}
	if (!isTerminalPasswordValid(password)) {
		throw new Error(
			"Secret perangkat minimal 16 karakter (huruf, angka, atau simbol ASCII).",
		);
	}

	const db = await getDb();
	await db.insert(terminals).values({
		id,
		name,
		password,
		status: "0",
	});
	revalidatePath("/presence/terminals");
	return { success: true };
}

export async function rotateTerminalPassword(terminalId: string) {
	const db = await getDb();
	const terminal = await db
		.select({ id: terminals.id })
		.from(terminals)
		.where(eq(terminals.id, terminalId))
		.then((r) => r[0]);
	if (!terminal) throw new Error("Perangkat tidak ditemukan");

	const password = generateTerminalPassword();
	await db
		.update(terminals)
		.set({ password })
		.where(eq(terminals.id, terminalId));

	revalidatePath("/presence/terminals");
	return { success: true, password };
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
	const users = await db.select().from(deviceUsers);

	const fidsWithFingerprints = users.filter((u) => !!u.fingerprint).map((u) => u.id);

	const terminal = await db
		.select()
		.from(terminals)
		.where(eq(terminals.id, terminalId))
		.then((r) => r[0]);
	if (!terminal) throw new Error("Terminal tidak ditemukan");

	// Command 6 (empty) runs first; after device ACK, route drains syncQueue as copy (3).
	await db
		.update(terminals)
		.set({
			status: "6",
			metadata: null,
			syncQueue: JSON.stringify(fidsWithFingerprints),
		})
		.where(eq(terminals.id, terminalId));

	revalidatePath("/presence/terminals");
	return { success: true, count: fidsWithFingerprints.length };
}
