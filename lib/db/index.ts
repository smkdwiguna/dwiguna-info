import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@netlify/neon";
import * as schema from "./schema";

/**
 * Netlify DB (Neon / Postgres) connection.
 *
 * `neon()` reads the connection string from `NETLIFY_DATABASE_URL` (injected by
 * Netlify automatically once a database is provisioned). The HTTP driver is a
 * good fit for serverless functions — the app uses no interactive transactions.
 *
 * Kept async so existing callers (`await getDb()`) stay unchanged.
 */
export async function getDb() {
	if (!process.env.NETLIFY_DATABASE_URL) {
		throw new Error(
			"NETLIFY_DATABASE_URL tidak ditemukan. Provision Netlify DB (`npx netlify db init`) atau set variabel ini di environment Netlify / .env lokal.",
		);
	}

	const sql = neon();
	return drizzle(sql, { schema });
}
