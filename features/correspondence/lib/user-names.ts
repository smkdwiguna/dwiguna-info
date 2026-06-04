import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/auth-schema";

/**
 * Resolve display names for the given emails from the auth `user` table.
 * Returns a lowercased-email -> name map; emails without a row are omitted so
 * callers can fall back to showing the raw email. Safe to call without a
 * session (used by the public verification pages) since it only reads names.
 */
export async function resolveUserNames(
	emails: string[],
): Promise<Record<string, string>> {
	const unique = Array.from(
		new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
	);
	if (unique.length === 0) return {};

	const db = await getDb();
	const rows = await db
		.select({ email: userTable.email, name: userTable.name })
		.from(userTable)
		.where(inArray(userTable.email, unique));

	const map: Record<string, string> = {};
	for (const row of rows) {
		if (row.name) map[row.email.toLowerCase()] = row.name;
	}
	return map;
}
