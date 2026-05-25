import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb() {
	const { env } = await getCloudflareContext({ async: true });

	if (!env || (!env.DB && !env.presensi)) {
		throw new Error(
			"Database binding 'presensi' tidak ditemukan. Jika Anda menjalankan 'npm run dev', bindings Cloudflare (seperti D1) tidak akan tersedia secara otomatis. Silakan gunakan perintah 'npm run preview' (yang menjalankan OpenNext & Wrangler) untuk menguji fitur database secara lokal.",
		);
	}

	const dbBinding = (env.presensi || env.DB) as any;
	return drizzle(dbBinding, { schema });
}
