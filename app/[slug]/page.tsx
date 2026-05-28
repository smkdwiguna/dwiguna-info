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

type YouTubeOEmbedResponse = {
	title?: string;
	thumbnail_url?: string;
	author_name?: string;
	provider_name?: string;
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

function getYouTubeVideoUrl(targetUrl: string) {
	try {
		const parsed = new URL(targetUrl);
		const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

		if (host === "youtu.be") {
			const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
			return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
		}

		if (host.endsWith("youtube.com")) {
			const videoId = parsed.searchParams.get("v");
			if (videoId) {
				return `https://www.youtube.com/watch?v=${videoId}`;
			}

			const pathParts = parsed.pathname.split("/").filter(Boolean);
			if (pathParts[0] === "shorts" && pathParts[1]) {
				return `https://www.youtube.com/watch?v=${pathParts[1]}`;
			}

			if (pathParts[0] === "embed" && pathParts[1]) {
				return `https://www.youtube.com/watch?v=${pathParts[1]}`;
			}
		}
	} catch {
		return null;
	}

	return null;
}

async function fetchYouTubeOEmbed(targetUrl: string): Promise<PreviewMetadata | null> {
	const normalizedUrl = getYouTubeVideoUrl(targetUrl);
	if (!normalizedUrl) {
		return null;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2500);

	try {
		const endpoint = new URL("https://www.youtube.com/oembed");
		endpoint.searchParams.set("url", normalizedUrl);
		endpoint.searchParams.set("format", "json");

		const response = await fetch(endpoint.toString(), {
			redirect: "follow",
			headers: {
				accept: "application/json",
				"user-agent":
					"Mozilla/5.0 (compatible; DwigunaInfoShortlink/1.0; +https://dwiguna.info)",
			},
			signal: controller.signal,
		});

		if (!response.ok) {
			return null;
		}

		const json = (await response.json()) as YouTubeOEmbedResponse;
		if (!json.title) {
			return null;
		}

		return {
			title: json.title,
			description: json.author_name || json.provider_name || "YouTube",
			image: json.thumbnail_url,
		};
	} catch (error) {
		console.error("[shortlink] YouTube oEmbed fetch failed", error);
		return null;
	} finally {
		clearTimeout(timeout);
	}
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

async function fetchHtmlPreviewMetadata(targetUrl: string) {
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
		console.error("[shortlink] HTML preview metadata fetch failed", error);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchTargetPreviewMetadata(targetUrl: string) {
	const youtubePreview = await fetchYouTubeOEmbed(targetUrl);
	const htmlPreview = await fetchHtmlPreviewMetadata(targetUrl);

	if (youtubePreview || htmlPreview) {
		return {
			title: youtubePreview?.title || htmlPreview?.title || new URL(targetUrl).hostname,
			description:
				htmlPreview?.description || youtubePreview?.description || `Buka ${targetUrl}`,
			image: youtubePreview?.image || htmlPreview?.image,
		};
	}

	return null;
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
