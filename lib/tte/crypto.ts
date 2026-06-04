/**
 * Edge / Cloudflare Worker-compatible cryptographic utilities for the
 * Correspondence (Tanda Tangan Elektronik / TTE) feature.
 *
 * IMPORTANT — Edge Runtime limitations:
 * - This module ONLY uses the Web Crypto API (`crypto.subtle`) and `Buffer`
 *   (provided by Cloudflare's `nodejs_compat`). It deliberately avoids Node's
 *   native `crypto` module and `fs`, so it runs unchanged on V8 isolates.
 * - RSA key generation uses native Web Crypto (fast) instead of a pure-JS
 *   implementation (slow) to stay within Worker CPU limits.
 */
import { Buffer } from "buffer";

// RSASSA-PKCS1-v1_5 + SHA-256: widely supported, deterministic to verify.
const RSA_ALGORITHM = "RSASSA-PKCS1-v1_5" as const;
export const TTE_KEY_ALGORITHM = "RSASSA-PKCS1-v1_5-2048-SHA256";

const RSA_KEY_GEN_PARAMS: RsaHashedKeyGenParams = {
	name: RSA_ALGORITHM,
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: "SHA-256",
};

const RSA_IMPORT_PARAMS: RsaHashedImportParams = {
	name: RSA_ALGORITHM,
	hash: "SHA-256",
};

// --- low-level encoding helpers ---

export function toBase64(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("base64");
}

export function fromBase64(value: string): Uint8Array {
	return new Uint8Array(Buffer.from(value, "base64"));
}

export function toHex(bytes: Uint8Array): string {
	let out = "";
	for (const byte of bytes) {
		out += byte.toString(16).padStart(2, "0");
	}
	return out;
}

function pemEncode(der: ArrayBuffer, label: string): string {
	const body = toBase64(new Uint8Array(der));
	const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
	return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
}

function pemDecode(pem: string): Uint8Array {
	const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
	return fromBase64(body);
}

// --- hashing ---

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
	const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
	return new Uint8Array(digest);
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
	return toHex(await sha256(data));
}

// --- asymmetric key pair (per user) ---

export interface SigningKeyPair {
	publicKeyPem: string;
	privateKeyPem: string;
}

export async function generateSigningKeyPair(): Promise<SigningKeyPair> {
	const pair = (await crypto.subtle.generateKey(RSA_KEY_GEN_PARAMS, true, [
		"sign",
		"verify",
	])) as CryptoKeyPair;

	const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
	const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);

	return {
		publicKeyPem: pemEncode(spki, "PUBLIC KEY"),
		privateKeyPem: pemEncode(pkcs8, "PRIVATE KEY"),
	};
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"pkcs8",
		pemDecode(privateKeyPem) as BufferSource,
		RSA_IMPORT_PARAMS,
		false,
		["sign"],
	);
}

async function importPublicKey(publicKeyPem: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"spki",
		pemDecode(publicKeyPem) as BufferSource,
		RSA_IMPORT_PARAMS,
		false,
		["verify"],
	);
}

/** Sign raw bytes with the user's private key. Returns the raw RSA signature. */
export async function signData(
	privateKeyPem: string,
	data: Uint8Array,
): Promise<Uint8Array> {
	const key = await importPrivateKey(privateKeyPem);
	const signature = await crypto.subtle.sign(
		RSA_ALGORITHM,
		key,
		data as BufferSource,
	);
	return new Uint8Array(signature);
}

/** Verify a raw RSA signature against bytes using the signer's public key. */
export async function verifyData(
	publicKeyPem: string,
	signature: Uint8Array,
	data: Uint8Array,
): Promise<boolean> {
	const key = await importPublicKey(publicKeyPem);
	return crypto.subtle.verify(
		RSA_ALGORITHM,
		key,
		signature as BufferSource,
		data as BufferSource,
	);
}

// --- private key encryption at rest ---
// The private key is never stored in plaintext. We encrypt it with AES-GCM
// using a key derived (SHA-256) from the server-only MASTER_SECRET env var.

async function deriveMasterKey(masterSecret: string): Promise<CryptoKey> {
	if (!masterSecret) {
		throw new Error("MASTER_SECRET tidak dikonfigurasi.");
	}
	const secretDigest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(masterSecret),
	);
	return crypto.subtle.importKey("raw", secretDigest, { name: "AES-GCM" }, false, [
		"encrypt",
		"decrypt",
	]);
}

export async function encryptPrivateKey(
	privateKeyPem: string,
	masterSecret: string,
): Promise<string> {
	const key = await deriveMasterKey(masterSecret);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		new TextEncoder().encode(privateKeyPem),
	);
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), iv.length);
	return toBase64(combined);
}

export async function decryptPrivateKey(
	payload: string,
	masterSecret: string,
): Promise<string> {
	const key = await deriveMasterKey(masterSecret);
	const combined = fromBase64(payload);
	const iv = combined.slice(0, 12);
	const ciphertext = combined.slice(12);
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		ciphertext as BufferSource,
	);
	return new TextDecoder().decode(plaintext);
}
