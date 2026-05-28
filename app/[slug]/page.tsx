import type { Metadata } from "next";
import { getShortLinkBySlug } from "@/features/short-links/actions/short-links";
import { shortLinks } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import ShortlinkRedirectClient from "@/features/short-links/components/shortlink-redirect-client";

export const dynamic = "force-dynamic";

type RouteParams = {
	slug: string;
};

type PreviewMetadata = {
	title: string;
	description: string;
	image?: string;
};

function resolveUrl(baseUrl: string, value?: string | null) {
	if (!value) {
		return undefined;
	}

	try {
		return new URL(value, baseUrl).toString();
	} catch {
		return undefined;
	}
}

function extractMetaContent(html: string, pattern: RegExp) {
	const match = html.match(pattern);
	return match?.[1]?.trim() || "";
}

function extractPreviewMetadata(
	html: string,
	targetUrl: string,
): PreviewMetadata {
	const title =
		extractMetaContent(
			html,
			/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
		) ||
		extractMetaContent(
			html,
			/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
		) ||
		extractMetaContent(html, /<title[^>]*>([^<]+)<\/title>/i) ||
		new URL(targetUrl).hostname;

	const description =
		extractMetaContent(
			html,
			/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
		) ||
		extractMetaContent(
			html,
			/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
		) ||
		extractMetaContent(
			html,
			/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
		) ||
		`Buka ${targetUrl}`;

	const imageRaw =
		extractMetaContent(
			html,
			/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
		) ||
		extractMetaContent(
			html,
			/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
		) ||
		extractMetaContent(
			html,
			/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i,
		);

	return {
		title,
		description,
		image: resolveUrl(targetUrl, imageRaw),
	};
}

async function fetchTargetPreviewMetadata(targetUrl: string) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2500);

	try {
		const response = await fetch(targetUrl, {
			redirect: "follow",
			headers: {
				accept: "text/html,application/xhtml+xml",
				"user-agent":
					"Mozilla/5.0 (compatible; DwigunaInfoShortlink/1.0; +https://dwiguna.info)",
			},
			signal: controller.signal,
		});

		if (!response.ok) {
			return null;
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("text/html")) {
			return null;
		}

		const html = await response.text();
		return extractPreviewMetadata(html, response.url || targetUrl);
	} catch (error) {
		console.error("[shortlink] preview metadata fetch failed", error);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

export async function generateMetadata({
	params,
}: {
	params: Promise<RouteParams>;
}): Promise<Metadata> {
	const { slug } = await params;
	const shortLink = await getShortLinkBySlug(slug);

	if (!shortLink) {
		return {};
	}

	const preview = await fetchTargetPreviewMetadata(shortLink.originalUrl);
	const title = preview?.title || shortLink.slug;
	const description =
		preview?.description || `Tautan pendek untuk ${shortLink.originalUrl}`;

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			url: shortLink.originalUrl,
			type: "website",
			images: preview?.image
				? [
						{
							url: preview.image,
							alt: title,
						},
					]
				: undefined,
		},
		twitter: {
			card: preview?.image ? "summary_large_image" : "summary",
			title,
			description,
			images: preview?.image ? [preview.image] : undefined,
		},
	};
}

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

	return (
		<ShortlinkRedirectClient targetUrl={shortLink.originalUrl} slug={slug} />
	);
}
