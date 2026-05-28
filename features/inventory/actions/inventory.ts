"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { uploadFileToDrive, deleteFileFromDrive } from "@/lib/google-drive";
import {
	inventories,
	inventoryMembers,
	inventoryItems,
	inventoryTransactions,
	inventoryFiles,
	inventoryItemAttachments,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/server-session";
import { isSuperUser } from "@/lib/access";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

// --- HELPERS ---

/**
 * Asserts that the current user has global access to the inventory module.
 * Returns the authenticated user's email.
 */
export async function assertInventoryGlobalAccess(): Promise<string> {
	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Sesi tidak valid. Silakan login kembali.");
	}

	const email = session.user.email;
	if (isSuperUser(email)) {
		return email;
	}

	return email;
}

/**
 * Check if the user is a global inventory administrator.
 * In this setup, only the superuser has global administrator privileges.
 */
export async function checkGlobalInventoryAdmin(
	email: string,
): Promise<boolean> {
	return isSuperUser(email);
}

/**
 * Asserts user access to a specific inventory and returns their role ('OWNER' | 'EDITOR' | 'VIEWER' | 'ADMIN').
 */
export async function assertInventoryAccess(
	inventoryId: number,
	allowedRoles: ("OWNER" | "EDITOR" | "VIEWER")[] = [
		"OWNER",
		"EDITOR",
		"VIEWER",
	],
): Promise<{ email: string; role: string }> {
	const email = await assertInventoryGlobalAccess();
	const isAdmin = await checkGlobalInventoryAdmin(email);

	if (isAdmin) {
		return { email, role: "ADMIN" };
	}

	const db = await getDb();
	const member = await db
		.select()
		.from(inventoryMembers)
		.where(
			and(
				eq(inventoryMembers.inventoryId, inventoryId),
				eq(inventoryMembers.email, email),
			),
		)
		.get();

	if (!member) {
		throw new Error("FORBIDDEN: Anda tidak memiliki akses ke inventaris ini.");
	}

	const role = member.role as "OWNER" | "EDITOR" | "VIEWER";
	if (!allowedRoles.includes(role)) {
		throw new Error(
			"FORBIDDEN: Tindakan ini tidak diizinkan untuk peran Anda.",
		);
	}

	return { email, role };
}

// --- SERVER ACTIONS ---

/**
 * Get all inventories accessible by the current user.
 */
export async function getInventories() {
	const email = await assertInventoryGlobalAccess();
	const isAdmin = await checkGlobalInventoryAdmin(email);
	const db = await getDb();

	if (isAdmin) {
		// Global admin or superuser sees all inventories
		return await db
			.select()
			.from(inventories)
			.orderBy(desc(inventories.id))
			.all();
	}

	// Normal user sees inventories they are a member of
	const userMemberships = await db
		.select({
			inventoryId: inventoryMembers.inventoryId,
		})
		.from(inventoryMembers)
		.where(eq(inventoryMembers.email, email))
		.all();

	if (userMemberships.length === 0) {
		return [];
	}

	const ids = userMemberships.map((m) => m.inventoryId);
	// We fetch the inventories using manual filtering since SQLite in D1 handles lists easily
	const allInvs = await db
		.select()
		.from(inventories)
		.orderBy(desc(inventories.id))
		.all();

	return allInvs.filter((inv) => ids.includes(inv.id));
}

/**
 * Creates a new inventory group and adds the creator as OWNER.
 */
export async function createInventory(name: string) {
	const {
		session,
		permissions,
		isSuperUser: superUser,
	} = await getLivePermissions();
	if (!session?.user?.email) {
		throw new Error("UNAUTHORIZED");
	}
	if (!superUser && !permissions.includes("inventory")) {
		throw new Error("FORBIDDEN: Anda tidak memiliki izin membuat inventaris.");
	}

	const email = session.user.email;
	const db = await getDb();

	if (!name.trim()) {
		throw new Error("Nama inventaris tidak boleh kosong.");
	}

	try {
		const [newInv] = await db
			.insert(inventories)
			.values({
				name: name.trim(),
			})
			.returning();

		await db.insert(inventoryMembers).values({
			inventoryId: newInv.id,
			email: email,
			role: "OWNER",
		});

		revalidatePath("/inventory");
		return newInv;
	} catch (error) {
		console.error("Gagal membuat inventaris:", error);
		throw new Error("Gagal membuat inventaris.");
	}
}

/**
 * Update the name of an inventory. Requires OWNER or Global Admin.
 */
export async function updateInventoryName(inventoryId: number, name: string) {
	await assertInventoryAccess(inventoryId, ["OWNER"]);
	const db = await getDb();

	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nama inventaris tidak boleh kosong.");
	}

	try {
		const [updated] = await db
			.update(inventories)
			.set({ name: trimmed })
			.where(eq(inventories.id, inventoryId))
			.returning();

		revalidatePath(`/inventory/${inventoryId}`);
		revalidatePath("/inventory");
		return updated;
	} catch (error) {
		console.error("Gagal memperbarui nama inventaris:", error);
		throw new Error("Gagal memperbarui nama inventaris.");
	}
}

/**
 * Deletes an inventory list entirely. Requires OWNER or Global Admin.
 */
export async function deleteInventory(inventoryId: number) {
	await assertInventoryAccess(inventoryId, ["OWNER"]);
	const db = await getDb();

	try {
		await db.delete(inventories).where(eq(inventories.id, inventoryId));
		revalidatePath("/inventory");
		return { success: true };
	} catch (error) {
		console.error("Gagal menghapus inventaris:", error);
		throw new Error("Gagal menghapus inventaris.");
	}
}

/**
 * Gets detailed info of a single inventory including its items, members, and transactions.
 */
export async function getInventoryDetail(inventoryId: number) {
	const { role, email } = await assertInventoryAccess(inventoryId, [
		"OWNER",
		"EDITOR",
		"VIEWER",
	]);
	const db = await getDb();

	const info = await db
		.select()
		.from(inventories)
		.where(eq(inventories.id, inventoryId))
		.get();

	if (!info) {
		throw new Error("Inventaris tidak ditemukan.");
	}

	const items = await db
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.inventoryId, inventoryId))
		.orderBy(desc(inventoryItems.id))
		.all();

	const members = await db
		.select()
		.from(inventoryMembers)
		.where(eq(inventoryMembers.inventoryId, inventoryId))
		.all();

	const txs = await db
		.select()
		.from(inventoryTransactions)
		.where(eq(inventoryTransactions.inventoryId, inventoryId))
		.orderBy(desc(inventoryTransactions.id))
		.all();

	const files = await db
		.select()
		.from(inventoryFiles)
		.where(eq(inventoryFiles.inventoryId, inventoryId))
		.orderBy(desc(inventoryFiles.id))
		.all();

	// Fetch all attachments for items belonging to this inventory
	const itemIds = items.map((item) => item.id);
	let attachments: (typeof inventoryItemAttachments.$inferSelect)[] = [];
	if (itemIds.length > 0) {
		const allAttachments = await db
			.select()
			.from(inventoryItemAttachments)
			.all();
		attachments = allAttachments.filter((att) => itemIds.includes(att.itemId));
	}

	return {
		inventory: info,
		userRole: role,
		userEmail: email,
		items,
		members,
		transactions: txs,
		files,
		attachments,
	};
}

/**
 * Returns files for an inventory without requiring membership check.
 * Files are considered visible to any logged-in workspace user.
 */
export async function getInventoryFilesPublic(inventoryId: number) {
	const email = await assertInventoryGlobalAccess();
	const db = await getDb();

	// No membership check: files are visible to any logged-in workspace user
	const files = await db
		.select()
		.from(inventoryFiles)
		.where(eq(inventoryFiles.inventoryId, inventoryId))
		.orderBy(desc(inventoryFiles.id))
		.all();

	return { files, requestedByEmail: email };
}

/**
 * Return whether the current user has membership to any inventory (or is superuser).
 * Used by client-side UI to decide whether to show inventory entries in the sidebar.
 */
export async function getHasAnyInventoryAccess(): Promise<boolean> {
	const session = await getServerSession();
	if (!session?.user?.email) return false;
	const email = session.user.email;
	if (isSuperUser(email)) return true;

	const db = await getDb();
	const memberships = await db
		.select()
		.from(inventoryMembers)
		.where(eq(inventoryMembers.email, email))
		.all();

	return memberships.length > 0;
}

/**
 * Transfer quantity of an item from one inventory to another.
 * - Requires OWNER/EDITOR on the source inventory and OWNER/EDITOR on the target inventory.
 * - If the target inventory does not have the same item (by sku if present, otherwise by name),
 *   the function creates a new item in the target inventory with the transferred quantity.
 */
export async function transferInventoryItem(
	sourceInventoryId: number,
	targetInventoryId: number,
	itemId: number,
	quantity: number,
) {
	if (quantity <= 0)
		throw new Error("Jumlah transfer harus lebih besar dari 0.");

	const { email: sourceEmail } = await assertInventoryAccess(
		sourceInventoryId,
		["OWNER", "EDITOR"],
	);
	await assertInventoryAccess(targetInventoryId, ["OWNER", "EDITOR"]);

	const db = await getDb();

	// Fetch source item
	const sourceItem = await db
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.inventoryId, sourceInventoryId),
			),
		)
		.get();

	if (!sourceItem) throw new Error("Barang sumber tidak ditemukan.");
	if (sourceItem.quantity < quantity)
		throw new Error("Stok tidak mencukupi untuk transfer.");

	// Decrease source quantity
	const newSourceQty = sourceItem.quantity - quantity;
	await db
		.update(inventoryItems)
		.set({ quantity: newSourceQty, updatedAt: new Date().toISOString() })
		.where(eq(inventoryItems.id, sourceItem.id));

	await db.insert(inventoryTransactions).values({
		inventoryId: sourceInventoryId,
		itemId: sourceItem.id,
		type: "OUT",
		quantity: -quantity,
		notes: `Transfer ke inventaris ${targetInventoryId}`,
		createdByEmail: sourceEmail,
	});

	// Look for matching item on target by sku (prefer) then name
	let targetItem = null;
	if (sourceItem.sku) {
		targetItem = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.inventoryId, targetInventoryId),
					eq(inventoryItems.sku, sourceItem.sku),
				),
			)
			.get();
	}
	if (!targetItem) {
		targetItem = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.inventoryId, targetInventoryId),
					eq(inventoryItems.name, sourceItem.name),
				),
			)
			.get();
	}

	if (!targetItem) {
		// Create a new item in target inventory
		const [created] = await db
			.insert(inventoryItems)
			.values({
				inventoryId: targetInventoryId,
				name: sourceItem.name,
				sku: sourceItem.sku || null,
				description: sourceItem.description || null,
				quantity: quantity,
				unit: sourceItem.unit || "pcs",
				location: sourceItem.location || null,
			})
			.returning();

		await db.insert(inventoryTransactions).values({
			inventoryId: targetInventoryId,
			itemId: created.id,
			type: "IN",
			quantity: quantity,
			notes: `Transfer dari inventaris ${sourceInventoryId}`,
			createdByEmail: sourceEmail,
		});

		revalidatePath(`/inventory/${sourceInventoryId}`);
		revalidatePath(`/inventory/${targetInventoryId}`);
		return { from: sourceItem.id, to: created.id };
	} else {
		// Update existing target item quantity
		const updatedQty = (targetItem.quantity || 0) + quantity;
		await db
			.update(inventoryItems)
			.set({ quantity: updatedQty, updatedAt: new Date().toISOString() })
			.where(eq(inventoryItems.id, targetItem.id));

		await db.insert(inventoryTransactions).values({
			inventoryId: targetInventoryId,
			itemId: targetItem.id,
			type: "IN",
			quantity: quantity,
			notes: `Transfer dari inventaris ${sourceInventoryId}`,
			createdByEmail: sourceEmail,
		});

		revalidatePath(`/inventory/${sourceInventoryId}`);
		revalidatePath(`/inventory/${targetInventoryId}`);
		return { from: sourceItem.id, to: targetItem.id };
	}
}

// --- ITEM ACTIONS ---

/**
 * Add a new item to an inventory. Requires OWNER or EDITOR or Global Admin.
 */
export async function addInventoryItem(
	inventoryId: number,
	payload: {
		name: string;
		sku?: string;
		description?: string;
		quantity: number;
		unit?: string;
		location?: string;
	},
) {
	const { email } = await assertInventoryAccess(inventoryId, [
		"OWNER",
		"EDITOR",
	]);
	const db = await getDb();

	if (!payload.name.trim()) {
		throw new Error("Nama barang tidak boleh kosong.");
	}

	const qty = payload.quantity < 0 ? 0 : payload.quantity;

	try {
		const [newItem] = await db
			.insert(inventoryItems)
			.values({
				inventoryId,
				name: payload.name.trim(),
				sku: payload.sku?.trim() || null,
				description: payload.description?.trim() || null,
				quantity: qty,
				unit: payload.unit?.trim() || "pcs",
				location: payload.location?.trim() || null,
			})
			.returning();

		// Record transaction log if starting quantity > 0
		if (qty > 0) {
			await db.insert(inventoryTransactions).values({
				inventoryId,
				itemId: newItem.id,
				type: "IN",
				quantity: qty,
				notes: "Stok awal saat menambahkan barang baru.",
				createdByEmail: email,
			});
		}

		revalidatePath(`/inventory/${inventoryId}`);
		return newItem;
	} catch (error) {
		console.error("Gagal menambahkan barang:", error);
		throw new Error("Gagal menambahkan barang.");
	}
}

/**
 * Update an existing item's info.
 */
export async function updateInventoryItem(
	inventoryId: number,
	itemId: number,
	payload: {
		name: string;
		sku?: string;
		description?: string;
		quantity?: number;
		unit?: string;
		location?: string;
	},
) {
	const { email } = await assertInventoryAccess(inventoryId, [
		"OWNER",
		"EDITOR",
	]);
	const db = await getDb();

	const current = await db
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.inventoryId, inventoryId),
			),
		)
		.get();

	if (!current) {
		throw new Error("Barang tidak ditemukan.");
	}

	try {
		const updates: Partial<typeof inventoryItems.$inferSelect> = {
			name: payload.name.trim(),
			sku: payload.sku?.trim() || null,
			description: payload.description?.trim() || null,
			unit: payload.unit?.trim() || "pcs",
			location: payload.location?.trim() || null,
			updatedAt: new Date().toISOString(),
		};

		if (
			payload.quantity !== undefined &&
			payload.quantity !== current.quantity
		) {
			const diff = payload.quantity - current.quantity;
			updates.quantity = payload.quantity;

			await db.insert(inventoryTransactions).values({
				inventoryId,
				itemId,
				type: "ADJUST",
				quantity: diff,
				notes: `Penyesuaian stok manual dari ${current.quantity} ke ${payload.quantity}.`,
				createdByEmail: email,
			});
		}

		const [updatedItem] = await db
			.update(inventoryItems)
			.set(updates)
			.where(eq(inventoryItems.id, itemId))
			.returning();

		revalidatePath(`/inventory/${inventoryId}`);
		return updatedItem;
	} catch (error) {
		console.error("Gagal mengubah barang:", error);
		throw new Error("Gagal mengubah barang.");
	}
}

/**
 * Deletes an item from the inventory.
 */
export async function deleteInventoryItem(inventoryId: number, itemId: number) {
	await assertInventoryAccess(inventoryId, ["OWNER", "EDITOR"]);
	const db = await getDb();

	try {
		await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));
		revalidatePath(`/inventory/${inventoryId}`);
		return { success: true };
	} catch (error) {
		console.error("Gagal menghapus barang:", error);
		throw new Error("Gagal menghapus barang.");
	}
}

/**
 * Create a transaction log (Stock In / Stock Out). Updates the item's total quantity.
 */
export async function createStockTransaction(
	inventoryId: number,
	itemId: number,
	payload: {
		type: "IN" | "OUT" | "ADJUST";
		quantity: number;
		notes?: string;
	},
) {
	const { email } = await assertInventoryAccess(inventoryId, [
		"OWNER",
		"EDITOR",
	]);
	const db = await getDb();

	if (payload.quantity <= 0) {
		throw new Error("Jumlah transaksi harus lebih besar dari 0.");
	}

	const item = await db
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.inventoryId, inventoryId),
			),
		)
		.get();

	if (!item) {
		throw new Error("Barang tidak ditemukan.");
	}

	let newQty = item.quantity;
	let qtyDelta = payload.quantity;

	if (payload.type === "IN") {
		newQty += payload.quantity;
	} else if (payload.type === "OUT") {
		if (item.quantity < payload.quantity) {
			throw new Error("Stok tidak mencukupi.");
		}
		newQty -= payload.quantity;
		qtyDelta = -payload.quantity;
	} else if (payload.type === "ADJUST") {
		// For adjust, positive means IN, negative means OUT
		// But payload.quantity is positive, so we let it be positive as passed
		newQty += payload.quantity;
	}

	try {
		// Update item quantity
		await db
			.update(inventoryItems)
			.set({
				quantity: newQty,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(inventoryItems.id, itemId));

		// Insert transaction
		await db.insert(inventoryTransactions).values({
			inventoryId,
			itemId,
			type: payload.type,
			quantity: qtyDelta,
			notes: payload.notes?.trim() || null,
			createdByEmail: email,
		});

		revalidatePath(`/inventory/${inventoryId}`);
		return { success: true };
	} catch (error) {
		console.error("Gagal melakukan transaksi:", error);
		throw new Error("Gagal memproses transaksi stok.");
	}
}

// --- MEMBER MANAGEMENT ACTIONS ---

/**
 * Add a member to the inventory with a specific role.
 */
export async function addInventoryMember(
	inventoryId: number,
	payload: {
		email: string;
		role: "OWNER" | "EDITOR" | "VIEWER";
	},
) {
	await assertInventoryAccess(inventoryId, ["OWNER"]);
	const db = await getDb();

	const targetEmail = payload.email.trim().toLowerCase();
	if (!targetEmail) {
		throw new Error("Email wajib diisi.");
	}

	try {
		// Check if already a member
		const existing = await db
			.select()
			.from(inventoryMembers)
			.where(
				and(
					eq(inventoryMembers.inventoryId, inventoryId),
					eq(inventoryMembers.email, targetEmail),
				),
			)
			.get();

		if (existing) {
			throw new Error("Pengguna sudah menjadi anggota inventaris ini.");
		}

		const [newMember] = await db
			.insert(inventoryMembers)
			.values({
				inventoryId,
				email: targetEmail,
				role: payload.role,
			})
			.returning();

		revalidatePath(`/inventory/${inventoryId}`);
		return newMember;
	} catch (error: unknown) {
		console.error("Gagal menambahkan anggota:", error);
		const message =
			error instanceof Error ? error.message : "Gagal menambahkan anggota.";
		throw new Error(message);
	}
}

/**
 * Remove a member from the inventory.
 */
export async function removeInventoryMember(
	inventoryId: number,
	memberId: number,
) {
	await assertInventoryAccess(inventoryId, ["OWNER"]);
	const db = await getDb();

	const member = await db
		.select()
		.from(inventoryMembers)
		.where(
			and(
				eq(inventoryMembers.id, memberId),
				eq(inventoryMembers.inventoryId, inventoryId),
			),
		)
		.get();

	if (!member) {
		throw new Error("Anggota tidak ditemukan.");
	}

	// Safety check: Cannot remove the last OWNER
	if (member.role === "OWNER") {
		const owners = await db
			.select()
			.from(inventoryMembers)
			.where(
				and(
					eq(inventoryMembers.inventoryId, inventoryId),
					eq(inventoryMembers.role, "OWNER"),
				),
			)
			.all();

		if (owners.length <= 1) {
			throw new Error(
				"Tidak dapat menghapus anggota ini. Inventaris harus memiliki minimal satu OWNER.",
			);
		}
	}

	try {
		await db.delete(inventoryMembers).where(eq(inventoryMembers.id, memberId));
		revalidatePath(`/inventory/${inventoryId}`);
		return { success: true };
	} catch (error) {
		console.error("Gagal menghapus anggota:", error);
		throw new Error("Gagal menghapus anggota.");
	}
}

/**
 * Update role of an inventory member.
 */
export async function updateInventoryMemberRole(
	inventoryId: number,
	memberId: number,
	role: "OWNER" | "EDITOR" | "VIEWER",
) {
	await assertInventoryAccess(inventoryId, ["OWNER"]);
	const db = await getDb();

	const member = await db
		.select()
		.from(inventoryMembers)
		.where(
			and(
				eq(inventoryMembers.id, memberId),
				eq(inventoryMembers.inventoryId, inventoryId),
			),
		)
		.get();

	if (!member) {
		throw new Error("Anggota tidak ditemukan.");
	}

	// Safety check: Cannot change role of the last OWNER
	if (member.role === "OWNER" && role !== "OWNER") {
		const owners = await db
			.select()
			.from(inventoryMembers)
			.where(
				and(
					eq(inventoryMembers.inventoryId, inventoryId),
					eq(inventoryMembers.role, "OWNER"),
				),
			)
			.all();

		if (owners.length <= 1) {
			throw new Error(
				"Tidak dapat mengubah peran. Inventaris harus memiliki minimal satu OWNER.",
			);
		}
	}

	try {
		const [updated] = await db
			.update(inventoryMembers)
			.set({ role })
			.where(eq(inventoryMembers.id, memberId))
			.returning();

		revalidatePath(`/inventory/${inventoryId}`);
		return updated;
	} catch (error) {
		console.error("Gagal memperbarui peran anggota:", error);
		throw new Error("Gagal memperbarui peran anggota.");
	}
}

// --- FILE ACTIONS ---

/**
 * Upload a file to Google Drive under the inventory's folder structure,
 * then record it in the database.
 */
export async function uploadInventoryFile(
	inventoryId: number,
	formData: FormData,
) {
	const { email } = await assertInventoryAccess(inventoryId, [
		"OWNER",
		"EDITOR",
	]);
	const db = await getDb();

	const file = formData.get("file") as File | null;
	if (!file || file.size === 0) {
		throw new Error("File tidak valid.");
	}

	// Fetch inventory name for the Drive folder structure
	const inv = await db
		.select()
		.from(inventories)
		.where(eq(inventories.id, inventoryId))
		.get();

	if (!inv) {
		throw new Error("Inventaris tidak ditemukan.");
	}

	const buffer = await file.arrayBuffer();

	const driveResult = await uploadFileToDrive(
		inv.name,
		file.name,
		file.type || "application/octet-stream",
		buffer,
	);

	const [inserted] = await db
		.insert(inventoryFiles)
		.values({
			inventoryId,
			driveFileId: driveResult.id,
			name: driveResult.name,
			webViewLink: driveResult.webViewLink,
			thumbnailLink: driveResult.thumbnailLink,
			uploadedByEmail: email,
		})
		.returning();

	revalidatePath(`/inventory/${inventoryId}`);
	return inserted;
}

/**
 * Delete a file from Google Drive and remove its database record.
 * Also removes all item attachment associations.
 */
export async function deleteInventoryFile(inventoryId: number, fileId: number) {
	await assertInventoryAccess(inventoryId, ["OWNER", "EDITOR"]);
	const db = await getDb();

	const file = await db
		.select()
		.from(inventoryFiles)
		.where(
			and(
				eq(inventoryFiles.id, fileId),
				eq(inventoryFiles.inventoryId, inventoryId),
			),
		)
		.get();

	if (!file) {
		throw new Error("File tidak ditemukan.");
	}

	// Delete from Google Drive (best-effort; don't block DB cleanup)
	try {
		await deleteFileFromDrive(file.driveFileId);
	} catch (error) {
		console.error("Gagal menghapus file dari Drive:", error);
	}

	// Delete file record (cascade will clean up attachments)
	await db.delete(inventoryFiles).where(eq(inventoryFiles.id, fileId));

	revalidatePath(`/inventory/${inventoryId}`);
}

/**
 * Attach an existing file to an item (many-to-many).
 */
export async function attachFileToItem(
	inventoryId: number,
	itemId: number,
	fileId: number,
) {
	await assertInventoryAccess(inventoryId, ["OWNER", "EDITOR"]);
	const db = await getDb();

	try {
		const [inserted] = await db
			.insert(inventoryItemAttachments)
			.values({ itemId, fileId })
			.returning();

		revalidatePath(`/inventory/${inventoryId}`);
		return inserted;
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "";
		if (message.includes("UNIQUE")) {
			throw new Error("File ini sudah terlampir pada barang ini.");
		}
		throw new Error("Gagal melampirkan file.");
	}
}

/**
 * Detach a file from an item.
 */
export async function detachFileFromItem(
	inventoryId: number,
	attachmentId: number,
) {
	await assertInventoryAccess(inventoryId, ["OWNER", "EDITOR"]);
	const db = await getDb();

	await db
		.delete(inventoryItemAttachments)
		.where(eq(inventoryItemAttachments.id, attachmentId));

	revalidatePath(`/inventory/${inventoryId}`);
}
