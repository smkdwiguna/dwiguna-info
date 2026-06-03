/**
 * PDF signing/verification for the Persuratan (TTE) feature.
 *
 * Flow (all Edge Runtime compatible — pdf-lib, @signpdf, node-forge are pure JS):
 * 1. `embedSignatureVisuals` draws the QR code(s) onto the PDF at the position
 *    and size chosen by the signer in the UI (ratios relative to the page).
 * 2. `addSignaturePlaceholder` injects a PAdES-style signature dictionary with a
 *    `/ByteRange` and an empty `/Contents` placeholder via @signpdf.
 * 3. `signPdf` fills `/Contents` with a detached PKCS#7 (CMS) blob produced by
 *    node-forge, and captures the exact bytes covered by the ByteRange so the
 *    caller can also store a raw Web-Crypto signature in D1 for verification.
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { SignPdf } from "@signpdf/signpdf";
import { Signer } from "@signpdf/utils";
import { Buffer } from "buffer";
import { signDetachedCms } from "./pkcs7";

export interface QrPlacement {
	/** 0-based page index. */
	page: number;
	/** Left position as a ratio (0..1) of page width. */
	x: number;
	/** Top position as a ratio (0..1) of page height (UI top-left origin). */
	y: number;
	/** Width as a ratio (0..1) of page width. */
	width: number;
	/** Height as a ratio (0..1) of page height. */
	height: number;
	/** PNG bytes of the QR code to draw. */
	qrPng: Uint8Array;
	/** Optional caption drawn under the QR (e.g. signer name + date). */
	label?: string;
}

/** Draw QR code(s) on the PDF at the requested positions/sizes. */
export async function embedSignatureVisuals(
	pdfBytes: Uint8Array,
	placements: QrPlacement[],
): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.load(pdfBytes);
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const pages = pdfDoc.getPages();

	for (const placement of placements) {
		const page = pages[placement.page];
		if (!page) continue;

		const { width: pageWidth, height: pageHeight } = page.getSize();
		const qrImage = await pdfDoc.embedPng(placement.qrPng);

		const drawWidth = placement.width * pageWidth;
		const drawHeight = placement.height * pageHeight;
		const drawX = placement.x * pageWidth;
		// Convert UI top-left origin to pdf-lib bottom-left origin.
		const drawY = pageHeight - placement.y * pageHeight - drawHeight;

		page.drawImage(qrImage, {
			x: drawX,
			y: drawY,
			width: drawWidth,
			height: drawHeight,
		});

		if (placement.label) {
			const fontSize = Math.max(5, Math.min(8, drawWidth / 12));
			page.drawText(placement.label, {
				x: drawX,
				y: drawY - fontSize - 2,
				size: fontSize,
				font,
				color: rgb(0.2, 0.2, 0.2),
				maxWidth: drawWidth * 1.6,
				lineHeight: fontSize + 1,
			});
		}
	}

	return pdfDoc.save({ useObjectStreams: false });
}

export interface PlaceholderOptions {
	reason: string;
	signerName: string;
	location?: string;
	contactInfo?: string;
}

/** Add a PAdES-style signature placeholder (ByteRange + empty /Contents). */
export function addSignaturePlaceholder(
	pdfBytes: Uint8Array,
	options: PlaceholderOptions,
): Uint8Array {
	const withPlaceholder = plainAddPlaceholder({
		pdfBuffer: Buffer.from(pdfBytes),
		reason: options.reason,
		contactInfo: options.contactInfo ?? "",
		name: options.signerName,
		location: options.location ?? "Dwiguna.Info",
		signatureLength: 8192,
	});
	return new Uint8Array(withPlaceholder);
}

/**
 * A @signpdf Signer that produces a detached PKCS#7 with node-forge and records
 * the exact ByteRange content that was signed (so callers can also persist a
 * raw Web-Crypto signature over the same bytes).
 */
class ForgeCmsSigner extends Signer {
	public signedContent: Uint8Array | null = null;

	constructor(
		private readonly certPem: string,
		private readonly privateKeyPem: string,
	) {
		super();
	}

	async sign(pdfBuffer: Buffer, signingTime?: Date): Promise<Buffer> {
		this.signedContent = new Uint8Array(pdfBuffer);
		const der = signDetachedCms(
			this.signedContent,
			this.certPem,
			this.privateKeyPem,
			signingTime ?? new Date(),
		);
		return Buffer.from(der);
	}
}

export interface SignResult {
	/** Final signed PDF bytes. */
	signedPdf: Uint8Array;
	/** Exact bytes covered by the signature ByteRange (for raw verification). */
	signedContent: Uint8Array;
}

/** Fill the placeholder with a PKCS#7 signature; returns the signed PDF. */
export async function signPdf(
	pdfWithPlaceholder: Uint8Array,
	certPem: string,
	privateKeyPem: string,
	signingTime: Date = new Date(),
): Promise<SignResult> {
	const signer = new ForgeCmsSigner(certPem, privateKeyPem);
	const signed = await new SignPdf().sign(
		Buffer.from(pdfWithPlaceholder),
		signer,
		signingTime,
	);
	if (!signer.signedContent) {
		throw new Error("Gagal menandatangani PDF: konten ByteRange tidak terbaca.");
	}
	return {
		signedPdf: new Uint8Array(signed),
		signedContent: signer.signedContent,
	};
}

export interface ExtractedByteRange {
	byteRange: [number, number, number, number];
	/** Concatenated bytes covered by the ByteRange (excludes /Contents). */
	content: Uint8Array;
	/** The raw signature bytes stored in /Contents (PKCS#7 DER). */
	contents: Uint8Array;
}

const BYTE_RANGE_REGEX = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;

/**
 * Parse every signature ByteRange in a PDF and return the covered content plus
 * the embedded PKCS#7 bytes. Multiple entries = multiple (incremental) signatures.
 */
export function extractByteRanges(pdfBytes: Uint8Array): ExtractedByteRange[] {
	// Read structural markers as latin1 so byte offsets line up exactly.
	const asString = Buffer.from(pdfBytes).toString("latin1");
	const results: ExtractedByteRange[] = [];

	BYTE_RANGE_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null = BYTE_RANGE_REGEX.exec(asString);
	while (match !== null) {
		const [a, b, c, d] = [
			Number(match[1]),
			Number(match[2]),
			Number(match[3]),
			Number(match[4]),
		];
		const first = pdfBytes.slice(a, a + b);
		const second = pdfBytes.slice(c, c + d);
		const content = new Uint8Array(first.length + second.length);
		content.set(first, 0);
		content.set(second, first.length);

		// /Contents hex string lives between the two ByteRange segments.
		const contentsHex = Buffer.from(
			pdfBytes.slice(a + b + 1, c - 1),
		).toString("latin1");
		const cleanHex = contentsHex.replace(/[^0-9a-fA-F]/g, "");
		const contents = new Uint8Array(
			(cleanHex.match(/.{1,2}/g) ?? []).map((h) => parseInt(h, 16)),
		);

		results.push({
			byteRange: [a, b, c, d],
			content,
			contents,
		});
		match = BYTE_RANGE_REGEX.exec(asString);
	}

	return results;
}
