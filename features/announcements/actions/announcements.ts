"use server";

import { getDb } from "@/lib/db";
import { announcements } from "@/lib/db/announcement-schema";
import { desc, eq, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/server-session";
import { requirePermission } from "@/features/access-management/actions/require-permission";
import sanitizeHtml from "sanitize-html";

export async function getLatestAnnouncements(limit: number = 3) {
	const db = await getDb();
	return db.query.announcements.findMany({
		orderBy: [desc(announcements.createdAt)],
		limit,
	});
}

export async function getAllAnnouncements() {
	const db = await getDb();
	return db.query.announcements.findMany({
		orderBy: [desc(announcements.createdAt)],
	});
}

export async function getAnnouncement(id: number) {
	const db = await getDb();
	return db.query.announcements.findFirst({
		where: eq(announcements.id, id),
	});
}

export async function createAnnouncement(title: string, content: string) {
	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Unauthorized");
	}

	await requirePermission("announcement");

	// Sanitize the HTML content before saving

	const sanitizedContent = sanitizeHtml(content, {
		// 1. Ensure tags are extended cleanly
		allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "iframe"],

		// 2. Explicitly map your image attributes
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ["src", "alt", "title", "width", "height", "referrerpolicy"],
			a: ["href", "name", "target", "rel"],
			iframe: [
				"src",
				"width",
				"height",
				"allow",
				"allowfullscreen",
				"frameborder",
			],
		},

		// 3. FORCE strict string enforcement values for referrerpolicy
		// Without this block, sanitize-html drops custom HTML5 validation parameters
		allowedClasses: {},
		transformTags: {
			img: (tagName, attribs) => {
				// Force the value to stay lowercase or fallback if missing
				return {
					tagName: "img",
					attribs: {
						...attribs,
						referrerpolicy: attribs.referrerpolicy || "no-referrer",
					},
				};
			},
		},

		allowedIframeHostnames: ["www.youtube.com", "youtube.com", "youtu.be"],
	});

	const db = await getDb();
	const [newAnnouncement] = await db
		.insert(announcements)
		.values({
			title,
			content: sanitizedContent,
			authorEmail: session.user.email,
		})
		.returning();

	return newAnnouncement;
}

export async function updateAnnouncement(
	id: number,
	title: string,
	content: string,
) {
	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Unauthorized");
	}

	await requirePermission("announcement");

	const sanitizedContent = sanitizeHtml(content, {
		allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "iframe"],
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ["src", "alt", "title", "width", "height", "referrerpolicy"],
			a: ["href", "name", "target"],
			iframe: [
				"src",
				"width",
				"height",
				"allow",
				"allowfullscreen",
				"frameborder",
			],
		},
		allowedClasses: {},
		transformTags: {
			img: (tagName, attribs) => {
				return {
					tagName: "img",
					attribs: {
						...attribs,
						referrerpolicy: attribs.referrerpolicy || "no-referrer",
					},
				};
			},
		},
		allowedIframeHostnames: ["www.youtube.com", "youtube.com", "youtu.be"],
	});

	const db = await getDb();
	const [updatedAnnouncement] = await db
		.update(announcements)
		.set({
			title,
			content: sanitizedContent,
			updatedAt: sql`(CURRENT_TIMESTAMP)`,
		})
		.where(eq(announcements.id, id))
		.returning();

	return updatedAnnouncement;
}

export async function deleteAnnouncement(id: number) {
	const session = await getServerSession();
	if (!session?.user?.email) {
		throw new Error("Unauthorized");
	}

	await requirePermission("announcement");

	const db = await getDb();
	await db.delete(announcements).where(eq(announcements.id, id));
}
