import type { Metadata } from "next";
import { getShortLinkBySlug } from "@/features/short-links/actions/short-links";
import { shortLinks } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import ShortlinkRedirectClient from "@/features/short-links/components/shortlink-redirect-client";
import {
	isReservedShortLinkSlug,
	isValidShortLinkSlugFormat,
	normalizeShortLinkSlug,
} from "@/lib/short-links";

export const dynamic = "force-dynamic";

type RouteParams = {
	slug: string;
};

type PreviewMetadata = {
	title: string;
	description: string;
	image?: string;
	siteName?: string;
};

type YouTubeOEmbedResponse = {
	title?: string;
	thumbnail_url?: string;
	author_name?: string;
	provider_name?: string;
};

function isRenderableShortLinkSlug(value: string) {
	const normalizedSlug = normalizeShortLinkSlug(value);
	return (
		normalizedSlug.length > 0 &&
		isValidShortLinkSlugFormat(normalizedSlug) &&
		!isReservedShortLinkSlug(normalizedSlug)
	);
}

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

function extractFirstMatch(html: string, patterns: RegExp[]) {
	for (const pattern of patterns) {
		const match = html.match(pattern);
		const value = match?.[1]?.trim();
		if (value) {
			return value;
		}
	}

	return "";
}

function extractMetaContent(html: string, pattern: RegExp) {
	const match = html.match(pattern);
	return match?.[1]?.trim() || "";
}

function discoverOEmbedEndpoint(html: string, baseUrl: string) {
	return resolveUrl(
		baseUrl,
		extractFirstMatch(html, [
			/<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]+type=["']application\/json\+oembed["'][^>]+href=["']([^"']+)["']/i,
			/<link[^>]+type=["']application\/json\+oembed["'][^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*alternate[^"']*["']/i,
		]),
	);
}

function extractJsonLdValue<T>(value: unknown, keys: string[]): T | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			const resolved = extractJsonLdValue<T>(entry, keys);
			if (resolved !== undefined) {
				return resolved;
			}
		}

		return undefined;
	}

	const record = value as Record<string, unknown>;
	for (const [key, nestedValue] of Object.entries(record)) {
		if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase())) {
			if (typeof nestedValue === "string") {
				const trimmed = nestedValue.trim();
				if (trimmed) {
					return trimmed as T;
				}
			}

			if (
				nestedValue &&
				typeof nestedValue === "object" &&
				"url" in nestedValue &&
				typeof (nestedValue as Record<string, unknown>).url === "string"
			) {
				const trimmed = ((nestedValue as Record<string, string>).url || "").trim();
				if (trimmed) {
					return trimmed as T;
				}
			}
		}

		const resolved = extractJsonLdValue<T>(nestedValue, keys);
		if (resolved !== undefined) {
			return resolved;
		}
	}

	return undefined;
}

function extractJsonLdMetadata(html: string): Partial<PreviewMetadata> {
	const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
	for (const script of scripts) {
		const raw = script[1]?.trim();
		if (!raw) continue;

		try {
			const parsed = JSON.parse(raw) as unknown;
			const title =
				extractJsonLdValue<string>(parsed, ["headline", "name", "alternateName"]) ||
				"";
			const description =
				extractJsonLdValue<string>(parsed, ["description"]) || "";
			const image =
				extractJsonLdValue<string>(parsed, ["image", "thumbnailUrl", "thumbnailURL"]) ||
				"";
			const siteName =
				extractJsonLdValue<string>(parsed, ["siteName", "publisher", "provider"]) ||
				"";

			if (title || description || image || siteName) {
				return {
					title: title || undefined,
					description: description || undefined,
					image: image || undefined,
					siteName: siteName || undefined,
				};
			}
		} catch {
			// Ignore malformed JSON-LD blocks.
		}
	}

	return {};
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

async function fetchYouTubeOEmbed(
	targetUrl: string,
): Promise<PreviewMetadata | null> {
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
	const structuredData = extractJsonLdMetadata(html);
	const siteName =
		extractFirstMatch(html, [
			/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i,
		]) || structuredData.siteName;

	const title =
		structuredData.title ||
		extractFirstMatch(html, [
			/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+itemprop=["']name["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,
		]) ||
		extractMetaContent(html, /<title[^>]*>([^<]+)<\/title>/i) ||
		extractFirstMatch(html, [
			/<h1[^>]*>([^<]+)<\/h1>/i,
			/<h1[^>]+aria-label=["']([^"']+)["'][^>]*>/i,
		]) ||
		siteName ||
		new URL(targetUrl).hostname;

	const description =
		structuredData.description ||
		extractFirstMatch(html, [
			/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+itemprop=["']description["'][^>]+content=["']([^"']+)["']/i,
		]) ||
		(siteName ? `${siteName}` : "") ||
		`Buka ${targetUrl}`;

	const imageRaw =
		structuredData.image ||
		extractFirstMatch(html, [
			/<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+property=["']og:image:url["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
			/<link[^>]+rel=["'](?:preload|image_src|icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i,
		]);

	return {
		title,
		description,
		image: resolveUrl(targetUrl, imageRaw),
		siteName,
	};
}

type HtmlPreviewDocument = {
	html: string;
	finalUrl: string;
};

async function fetchHtmlPreviewDocument(
	targetUrl: string,
): Promise<HtmlPreviewDocument | null> {
	let parsedTargetUrl: URL;
	try {
		parsedTargetUrl = new URL(targetUrl);
	} catch {
		return null;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2500);

	try {
		const response = await fetch(parsedTargetUrl.toString(), {
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
		return {
			html,
			finalUrl: response.url || targetUrl,
		};
	} catch (error) {
		console.error("[shortlink] HTML preview metadata fetch failed", error);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchOEmbedPreviewMetadata(
	html: string,
	targetUrl: string,
): Promise<PreviewMetadata | null> {
	const endpoint = discoverOEmbedEndpoint(html, targetUrl);
	if (!endpoint) {
		return null;
	}

	const oEmbedUrl = new URL(endpoint);
	oEmbedUrl.searchParams.set("url", targetUrl);
	oEmbedUrl.searchParams.set("format", "json");

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2500);

	try {
		const response = await fetch(oEmbedUrl.toString(), {
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
			description: json.author_name || json.provider_name || `Buka ${targetUrl}`,
			image: json.thumbnail_url,
		};
	} catch (error) {
		console.error("[shortlink] oEmbed preview fetch failed", error);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchTargetPreviewMetadata(targetUrl: string) {
	let parsedTargetUrl: URL;
	try {
		parsedTargetUrl = new URL(targetUrl);
	} catch {
		return null;
	}

	const youtubePreview = await fetchYouTubeOEmbed(targetUrl);
	const htmlDocument = await fetchHtmlPreviewDocument(targetUrl);
	const htmlPreview = htmlDocument
		? extractPreviewMetadata(htmlDocument.html, htmlDocument.finalUrl)
		: null;
	const oEmbedPreview = htmlDocument
		? await fetchOEmbedPreviewMetadata(htmlDocument.html, htmlDocument.finalUrl)
		: null;

	if (youtubePreview || htmlPreview || oEmbedPreview) {
		return {
			title:
				youtubePreview?.title ||
				oEmbedPreview?.title ||
				htmlPreview?.title ||
				parsedTargetUrl.hostname,
			description:
				htmlPreview?.description ||
				oEmbedPreview?.description ||
				youtubePreview?.description ||
				`Buka ${parsedTargetUrl.toString()}`,
			image: youtubePreview?.image || oEmbedPreview?.image || htmlPreview?.image,
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
	if (!isRenderableShortLinkSlug(slug)) {
		return {};
	}

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
	if (!isRenderableShortLinkSlug(slug)) {
		notFound();
	}

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
