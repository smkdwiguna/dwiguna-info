import { decode as decodeJpeg, encode as encodeJpeg } from "jpeg-js";
import { PNG } from "pngjs";

/** Square avatar for TFT widgets (device display 480×320; photo is not full-screen). */
export const DEVICE_AVATAR_SIZE = 120;

/** JPEG quality — balances clarity vs. hex payload size on the wire. */
export const DEVICE_AVATAR_JPEG_QUALITY = 72;

const FONT_5X7: Record<string, readonly number[]> = {
	"?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
	A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
	B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
	C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
	D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
	E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
	F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
	G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
	H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
	I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
	J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
	K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
	L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
	M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
	N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
	O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
	P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
	Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
	R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
	S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
	T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
	U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
	V: [0x11, 0x11, 0x11, 0x11, 0x0a, 0x0a, 0x04],
	W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
	X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
	Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
	Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
	"0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
	"1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
	"2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
	"3": [0x1e, 0x01, 0x01, 0x06, 0x01, 0x01, 0x1e],
	"4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
	"5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
	"6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
	"7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
	"8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
	"9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
};

const INITIALS_PIXEL_SCALE = 9;
const INITIALS_CHAR_GAP = 2;

export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function extractInitials(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) {
		const word = parts[0];
		return word.slice(0, 2).toUpperCase();
	}
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isGooglePhotoNotFoundError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return (
		error.message.includes('"code": 404') ||
		error.message.includes("Resource Not Found: photo") ||
		("status" in error && (error as { status?: number }).status === 404)
	);
}

function nameToAccentRgb(name: string): [number, number, number] {
	let hash = 0;
	for (let i = 0; i < name.length; i += 1) {
		hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	}
	const hue = hash % 360;
	const saturation = 0.45;
	const lightness = 0.42;
	return hslToRgb(hue / 360, saturation, lightness);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	if (s === 0) {
		const gray = Math.round(l * 255);
		return [gray, gray, gray];
	}

	const hue2rgb = (p: number, q: number, t: number) => {
		let tt = t;
		if (tt < 0) tt += 1;
		if (tt > 1) tt -= 1;
		if (tt < 1 / 6) return p + (q - p) * 6 * tt;
		if (tt < 1 / 2) return q;
		if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [
		Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		Math.round(hue2rgb(p, q, h) * 255),
		Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	];
}

function fontGlyph(char: string): readonly number[] {
	const normalized = char.toUpperCase();
	return FONT_5X7[normalized] ?? FONT_5X7["?"] ?? [];
}

function setPixel(
	data: Uint8Array,
	width: number,
	x: number,
	y: number,
	r: number,
	g: number,
	b: number,
) {
	if (x < 0 || y < 0 || x >= width) return;
	const row = Math.floor(y);
	const col = Math.floor(x);
	const idx = (row * width + col) * 4;
	data[idx] = r;
	data[idx + 1] = g;
	data[idx + 2] = b;
	data[idx + 3] = 255;
}

function fillSolid(
	data: Uint8Array,
	width: number,
	height: number,
	r: number,
	g: number,
	b: number,
) {
	for (let i = 0; i < width * height; i += 1) {
		const idx = i * 4;
		data[idx] = r;
		data[idx + 1] = g;
		data[idx + 2] = b;
		data[idx + 3] = 255;
	}
}

function drawGlyph(
	data: Uint8Array,
	canvasSize: number,
	offsetX: number,
	offsetY: number,
	char: string,
	r: number,
	g: number,
	b: number,
) {
	const glyph = fontGlyph(char);
	const scale = INITIALS_PIXEL_SCALE;

	for (let row = 0; row < glyph.length; row += 1) {
		const bits = glyph[row] ?? 0;
		for (let col = 0; col < 5; col += 1) {
			if ((bits & (1 << (4 - col))) === 0) continue;
			for (let sy = 0; sy < scale; sy += 1) {
				for (let sx = 0; sx < scale; sx += 1) {
					setPixel(
						data,
						canvasSize,
						offsetX + col * scale + sx,
						offsetY + row * scale + sy,
						r,
						g,
						b,
					);
				}
			}
		}
	}
}

function createInitialsRgba(name: string, size: number): Uint8Array {
	const [bgR, bgG, bgB] = nameToAccentRgb(name);
	const data = new Uint8Array(size * size * 4);
	fillSolid(data, size, size, bgR, bgG, bgB);

	const initials = extractInitials(name)
		.replace(/[^A-Za-z0-9?]/g, "")
		.slice(0, 2)
		.toUpperCase();
	const chars =
		initials.length > 0 ? initials.split("") : ["?"];

	const glyphW = 5 * INITIALS_PIXEL_SCALE;
	const glyphH = 7 * INITIALS_PIXEL_SCALE;
	const gap = INITIALS_CHAR_GAP * INITIALS_PIXEL_SCALE;
	const totalW = chars.length * glyphW + (chars.length - 1) * gap;
	const startX = Math.floor((size - totalW) / 2);
	const startY = Math.floor((size - glyphH) / 2);

	chars.forEach((char, index) => {
		drawGlyph(
			data,
			size,
			startX + index * (glyphW + gap),
			startY,
			char,
			255,
			255,
			255,
		);
	});

	return data;
}

function resizeCoverRgba(
	src: Uint8Array,
	srcW: number,
	srcH: number,
	dstW: number,
	dstH: number,
): Uint8Array {
	const dst = new Uint8Array(dstW * dstH * 4);
	const cropW = dstW / Math.max(dstW / srcW, dstH / srcH);
	const cropH = dstH / Math.max(dstW / srcW, dstH / srcH);
	const cropX = (srcW - cropW) / 2;
	const cropY = (srcH - cropH) / 2;

	for (let y = 0; y < dstH; y += 1) {
		for (let x = 0; x < dstW; x += 1) {
			const srcX = Math.min(
				srcW - 1,
				Math.max(0, Math.floor(cropX + ((x + 0.5) * cropW) / dstW)),
			);
			const srcY = Math.min(
				srcH - 1,
				Math.max(0, Math.floor(cropY + ((y + 0.5) * cropH) / dstH)),
			);
			const srcIdx = (srcY * srcW + srcX) * 4;
			const dstIdx = (y * dstW + x) * 4;
			dst[dstIdx] = src[srcIdx] ?? 0;
			dst[dstIdx + 1] = src[srcIdx + 1] ?? 0;
			dst[dstIdx + 2] = src[srcIdx + 2] ?? 0;
			dst[dstIdx + 3] = 255;
		}
	}

	return dst;
}

function decodeToRgba(bytes: Uint8Array): {
	data: Uint8Array;
	width: number;
	height: number;
} {
	try {
		const decoded = decodeJpeg(bytes, { useTArray: true });
		return {
			data: decoded.data,
			width: decoded.width,
			height: decoded.height,
		};
	} catch {
		// Google may return PNG in some cases
	}

	const png = PNG.sync.read(Buffer.from(bytes));
	return {
		data: new Uint8Array(png.data),
		width: png.width,
		height: png.height,
	};
}

function encodeAvatarJpeg(rgba: Uint8Array, size: number): Uint8Array {
	const encoded = encodeJpeg(
		{ data: rgba, width: size, height: size },
		DEVICE_AVATAR_JPEG_QUALITY,
	);
	return encoded.data;
}

function prepareSourceBytes(bytes: Uint8Array): Uint8Array {
	const { data, width, height } = decodeToRgba(bytes);
	const resized = resizeCoverRgba(
		data,
		width,
		height,
		DEVICE_AVATAR_SIZE,
		DEVICE_AVATAR_SIZE,
	);
	return encodeAvatarJpeg(resized, DEVICE_AVATAR_SIZE);
}

function prepareInitialsBytes(displayName: string): Uint8Array {
	const rgba = createInitialsRgba(displayName, DEVICE_AVATAR_SIZE);
	return encodeAvatarJpeg(rgba, DEVICE_AVATAR_SIZE);
}

/** Returns JPEG bytes as lowercase hex for the device protocol. */
export async function buildDevicePhotoHex(
	displayName: string,
	sourceBytes: Uint8Array | null,
): Promise<string> {
	try {
		const jpegBytes = sourceBytes
			? prepareSourceBytes(sourceBytes)
			: prepareInitialsBytes(displayName);
		return bytesToHex(jpegBytes);
	} catch (error) {
		console.warn(
			"[device-user-photo] failed to prepare photo, using initials",
			error,
		);
		return bytesToHex(prepareInitialsBytes(displayName));
	}
}
