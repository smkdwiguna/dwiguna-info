/**
 * PKCS#7 / X.509 helpers for the Correspondence (TTE) feature, built on `node-forge`.
 *
 * Edge Runtime notes:
 * - `node-forge` is pure JS and runs on Cloudflare Workers (with `nodejs_compat`).
 * - We only use forge for building an X.509 self-signed certificate and a
 *   detached PKCS#7 (CMS) SignedData blob that gets embedded into the PDF's
 *   signature `/Contents` (so the result looks like a PAdES signature to PDF
 *   readers). Cryptographic *verification* in this app is done with Web Crypto
 *   over the signed ByteRange (see `lib/tte/crypto.ts`) plus the signature stored
 *   in D1, because forge does not verify CMS reliably.
 */
import forge from "node-forge";
import { Buffer } from "buffer";

export interface SelfSignedCertOptions {
	publicKeyPem: string;
	privateKeyPem: string;
	commonName: string;
	email: string;
}

/**
 * Build a self-signed X.509 certificate that wraps the user's public key.
 * This is an "internal CA" certificate: trust is established by our own D1
 * `user_keys` table, not by an external Certificate Authority.
 */
export function createSelfSignedCertificate(
	options: SelfSignedCertOptions,
): string {
	const cert = forge.pki.createCertificate();
	cert.publicKey = forge.pki.publicKeyFromPem(options.publicKeyPem);

	// 16-byte random, positive serial number (leading 0 keeps it positive).
	const serialBytes = crypto.getRandomValues(new Uint8Array(16));
	let serialHex = "";
	for (const byte of serialBytes) {
		serialHex += byte.toString(16).padStart(2, "0");
	}
	cert.serialNumber = `00${serialHex}`;

	const now = new Date();
	cert.validity.notBefore = now;
	cert.validity.notAfter = new Date(
		now.getFullYear() + 10,
		now.getMonth(),
		now.getDate(),
	);

	const attrs: forge.pki.CertificateField[] = [
		{ name: "commonName", value: options.commonName },
		{ name: "organizationName", value: "SMK TI Dwiguna" },
		{ name: "organizationalUnitName", value: "Dwiguna.Info" },
	];
	cert.setSubject(attrs);
	cert.setIssuer(attrs);
	cert.setExtensions([
		{ name: "basicConstraints", cA: false },
		{ name: "keyUsage", digitalSignature: true, nonRepudiation: true },
		{ name: "extKeyUsage", emailProtection: true },
		{ name: "subjectAltName", altNames: [{ type: 1, value: options.email }] },
	]);

	cert.sign(
		forge.pki.privateKeyFromPem(options.privateKeyPem),
		forge.md.sha256.create(),
	);

	return forge.pki.certificateToPem(cert);
}

function bytesToForgeBinary(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("binary");
}

function forgeBinaryToBytes(binary: string): Uint8Array {
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		out[i] = binary.charCodeAt(i) & 0xff;
	}
	return out;
}

/**
 * Produce a detached PKCS#7 (CMS) SignedData over `content`, DER encoded.
 * Detached means the content itself is not embedded, only its signature —
 * exactly what a PDF ByteRange signature needs.
 */
export function signDetachedCms(
	content: Uint8Array,
	certPem: string,
	privateKeyPem: string,
	signingTime: Date = new Date(),
): Uint8Array {
	const p7 = forge.pkcs7.createSignedData();
	p7.content = forge.util.createBuffer(bytesToForgeBinary(content));

	const cert = forge.pki.certificateFromPem(certPem);
	const key = forge.pki.privateKeyFromPem(privateKeyPem);

	p7.addCertificate(cert);
	p7.addSigner({
		key,
		certificate: cert,
		digestAlgorithm: forge.pki.oids.sha256,
		authenticatedAttributes: [
			{ type: forge.pki.oids.contentType, value: forge.pki.oids.data },
			{ type: forge.pki.oids.messageDigest },
			{ type: forge.pki.oids.signingTime, value: signingTime.toString() },
		],
	});

	p7.sign({ detached: true });
	const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
	return forgeBinaryToBytes(der);
}

/** Extract the first certificate's public key (SPKI PEM) from a DER CMS blob. */
export function extractPublicKeyFromCms(cmsDer: Uint8Array): string | null {
	try {
		// The PDF /Contents placeholder is zero-padded, so there may be trailing
		// bytes after the DER. `parseAllBytes: false` tolerates that padding.
		const asn1 = forge.asn1.fromDer(
			forge.util.createBuffer(bytesToForgeBinary(cmsDer)),
			// node-forge accepts an options object at runtime; the bundled types
			// only declare the legacy boolean `strict` parameter.
			{ strict: false, parseAllBytes: false } as unknown as boolean,
		);
		const msg = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData;
		const certificate = msg.certificates?.[0];
		if (!certificate) return null;
		return forge.pki.publicKeyToPem(certificate.publicKey);
	} catch {
		return null;
	}
}
