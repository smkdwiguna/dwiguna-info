import { getShortLinkBySlug } from "@/features/short-links/actions/short-links";
import { shortLinks } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ShortLinkRedirectPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const shortLink = await getShortLinkBySlug(slug);

	if (!shortLink) {
		notFound();
	}

	const db = await getDb();
	try {
		await db
			.update(shortLinks)
			.set({ clickCount: sql`${shortLinks.clickCount} + 1` })
			.where(eq(shortLinks.id, shortLink.id));
	} catch (error) {
		console.error("[short-link] failed to increment click count", error);
	}

	redirect(shortLink.originalUrl);
}
