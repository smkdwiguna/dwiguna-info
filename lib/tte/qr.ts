/**
 * QR code generation for the Correspondence (TTE) feature.
 * `qrcode` is pure JS (uses pngjs) and runs on the Edge Runtime.
 */
import QRCode from "qrcode";
import { fromBase64 } from "./crypto";

/** Generate a PNG image (bytes) for the given text/URL. */
export async function generateQrPng(text: string): Promise<Uint8Array> {
	const dataUrl = await QRCode.toDataURL(text, {
		errorCorrectionLevel: "M",
		margin: 1,
		scale: 8,
	});
	const base64 = dataUrl.split(",")[1] ?? "";
	return fromBase64(base64);
}
