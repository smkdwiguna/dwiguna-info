import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Turso DB (SQLite) connection.
 *
 * `createClient()` reads the connection string from `TURSO_DATABASE_URL` and
 * `TURSO_AUTH_TOKEN`.
 *
 * Kept async so existing callers (`await getDb()`) stay unchanged.
 */
export async function getDb() {
	if (!process.env.TURSO_DATABASE_URL) {
		throw new Error(
			"TURSO_DATABASE_URL tidak ditemukan. Set variabel ini di environment Turso / .env lokal.",
		);
	}

	const client = createClient({
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_AUTH_TOKEN,
	});
	return drizzle(client, { schema });
}
