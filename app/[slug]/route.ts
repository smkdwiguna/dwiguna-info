import { getShortLinkBySlug } from "@/features/short-links/actions/short-links";
import { getDb } from "@/lib/db";
import { shortLinks } from "@/lib/db/schema";
import {
	isReservedShortLinkSlug,
	isValidShortLinkSlugFormat,
	normalizeShortLinkSlug,
} from "@/lib/short-links";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteParams = {
	slug: string;
};

function isRenderableShortLinkSlug(value: string) {
	const normalizedSlug = normalizeShortLinkSlug(value);
	return (
		normalizedSlug.length > 0 &&
		isValidShortLinkSlugFormat(normalizedSlug) &&
		!isReservedShortLinkSlug(normalizedSlug)
	);
}

async function incrementShortLinkClick(shortLinkId: number) {
	const db = await getDb();
	try {
		await db
			.update(shortLinks)
			.set({ clickCount: sql`${shortLinks.clickCount} + 1` })
			.where(eq(shortLinks.id, shortLinkId));
	} catch (error) {
		console.error("[short-link] failed to increment click count", error);
	}
}

function createPermanentRedirectResponse(targetUrl: string) {
	return new Response(null, {
		status: 301,
		headers: {
			location: targetUrl,
			"cache-control": "no-store, max-age=0",
		},
	});
}

function isPrefetchRequest(request: Request) {
	const purpose = request.headers.get("purpose") || "";
	const secPurpose = request.headers.get("sec-purpose") || "";
	return (
		purpose.toLowerCase().includes("prefetch") ||
		secPurpose.toLowerCase().includes("prefetch") ||
		secPurpose.toLowerCase().includes("prerender") ||
		request.headers.has("next-router-prefetch") ||
		request.headers.has("x-middleware-prefetch")
	);
}

async function handleShortLinkRedirect(
	request: Request,
	params: Promise<RouteParams>,
	options: { countClick: boolean },
) {
	const { slug } = await params;
	if (!isRenderableShortLinkSlug(slug)) {
		return new Response("Not Found", { status: 404 });
	}

	const shortLink = await getShortLinkBySlug(slug);
	if (!shortLink) {
		return new Response("Not Found", { status: 404 });
	}

	if (options.countClick && !isPrefetchRequest(request)) {
		await incrementShortLinkClick(shortLink.id);
	}

	return createPermanentRedirectResponse(shortLink.originalUrl);
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<RouteParams> },
) {
	return handleShortLinkRedirect(request, params, { countClick: true });
}

export async function HEAD(
	request: Request,
	{ params }: { params: Promise<RouteParams> },
) {
	return handleShortLinkRedirect(request, params, { countClick: false });
}
