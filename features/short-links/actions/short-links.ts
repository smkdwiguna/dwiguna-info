"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { shortLinks } from "@/lib/db/schema";
import { getServerSession } from "@/lib/server-session";
import {
	generateRandomShortLinkSlug,
	isReservedShortLinkSlug,
	isValidShortLinkSlugFormat,
	normalizeShortLinkSlug,
	parseShortLinkTargetUrl,
} from "@/lib/short-links";
import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";

export type ShortLinkRecord = {
	id: number;
	slug: string;
	originalUrl: string;
	createdByEmail: string;
	createdAt: string;
	clickCount: number;
};

export type ShortLinkValidationResult =
	| {
			valid: true;
			normalizedSlug: string;
			message: string;
	  }
	| {
			valid: false;
			normalizedSlug: string;
			message: string;
	  };

async function ensureShortLinksAccess() {
	await requirePermissionOrRedirect("shortlink");
}

async function findShortLinkBySlugInternal(slug: string) {
	const db = await getDb();
	return await db
		.select()
		.from(shortLinks)
		.where(eq(shortLinks.slug, slug))
		.get();
}

async function assertShortLinkSlugAvailability(slugInput: string) {
	const slug = normalizeShortLinkSlug(slugInput);
	if (!slug) {
		return {
			valid: true,
			normalizedSlug: "",
			message: "Slug akan dibuat otomatis.",
		} satisfies ShortLinkValidationResult;
	}

	if (!isValidShortLinkSlugFormat(slug)) {
		return {
			valid: false,
			normalizedSlug: slug,
			message:
				"Slug hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.",
		} satisfies ShortLinkValidationResult;
	}

	if (isReservedShortLinkSlug(slug)) {
		return {
			valid: false,
			normalizedSlug: slug,
			message: "Slug ini bentrok dengan route sistem yang sudah ada.",
		} satisfies ShortLinkValidationResult;
	}

	const existing = await findShortLinkBySlugInternal(slug);
	if (existing) {
		return {
			valid: false,
			normalizedSlug: slug,
			message: "Slug ini sudah dipakai shortlink lain.",
		} satisfies ShortLinkValidationResult;
	}

	return {
		valid: true,
		normalizedSlug: slug,
		message: "Slug tersedia.",
	} satisfies ShortLinkValidationResult;
}

export async function validateShortLinkSlug(
	slugInput: string,
): Promise<ShortLinkValidationResult> {
	await ensureShortLinksAccess();
	return await assertShortLinkSlugAvailability(slugInput);
}

export async function getCurrentUserShortLinks(): Promise<ShortLinkRecord[]> {
	await ensureShortLinksAccess();
	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Sesi pengguna tidak ditemukan.");
	}

	const db = await getDb();
	return await db
		.select()
		.from(shortLinks)
		.where(eq(shortLinks.createdByEmail, session.user.email))
		.orderBy(desc(shortLinks.id))
		.all();
}

export async function createShortLink(payload: {
	originalUrl: string;
	slug?: string;
}) {
	await ensureShortLinksAccess();

	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Sesi pengguna tidak ditemukan.");
	}

	const parsedUrl = parseShortLinkTargetUrl(payload.originalUrl);
	const requestedSlug = normalizeShortLinkSlug(payload.slug || "");
	const db = await getDb();

	let slug = requestedSlug;
	if (slug) {
		const validation = await assertShortLinkSlugAvailability(slug);
		if (!validation.valid) {
			throw new Error(validation.message);
		}
	} else {
		let created = false;
		for (let attempt = 0; attempt < 8; attempt += 1) {
			slug = generateRandomShortLinkSlug();
			const validation = await assertShortLinkSlugAvailability(slug);
			if (validation.valid) {
				created = true;
				break;
			}
		}

		if (!created || !slug) {
			throw new Error("Gagal membuat slug acak, coba lagi.");
		}
	}

	try {
		const [createdShortLink] = await db
			.insert(shortLinks)
			.values({
				slug,
				originalUrl: parsedUrl.toString(),
				createdByEmail: session.user.email,
			})
			.returning();

		revalidatePath("/shortlinks");
		return createdShortLink;
	} catch (error) {
		console.error("[createShortLink] failed", error);
		throw new Error("Gagal membuat shortlink.");
	}
}

export async function deleteShortLink(shortLinkId: number) {
	await ensureShortLinksAccess();

	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Sesi pengguna tidak ditemukan.");
	}

	const db = await getDb();
	const current = await db
		.select()
		.from(shortLinks)
		.where(eq(shortLinks.id, shortLinkId))
		.get();

	if (!current) {
		throw new Error("Shortlink tidak ditemukan.");
	}

	if (current.createdByEmail !== session.user.email) {
		throw new Error("Anda tidak berhak menghapus shortlink ini.");
	}

	await db.delete(shortLinks).where(eq(shortLinks.id, shortLinkId));
	revalidatePath("/shortlinks");
	return { success: true };
}

export async function getShortLinkBySlug(slug: string) {
	const normalizedSlug = normalizeShortLinkSlug(slug);
	if (!normalizedSlug) {
		return null;
	}

	const db = await getDb();
	return await db
		.select()
		.from(shortLinks)
		.where(eq(shortLinks.slug, normalizedSlug))
		.get();
}
