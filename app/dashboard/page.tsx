import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	Bell,
	CalendarClock,
	BookOpen,
	GraduationCap,
	LogOut,
} from "lucide-react"; // Pastikan lucide-react sudah di-install

export default async function DashboardPage() {
	// Ambil sesi user (Stateless Better-Auth)
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const user = session.user as typeof session.user & { role: string };

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 font-sans">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* --- HEADER --- */}
				<header className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
							Halo, {user.name} 👋
						</h1>
						<p className="text-sm text-zinc-500">
							SMK TI Dwiguna •{" "}
							{user.role === "STUDENT" ? "Siswa" : "Guru/Staff"}
						</p>
					</div>
					<button className="p-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 transition">
						<Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
					</button>
				</header>

				{/* --- BENTO GRID LAYOUT --- */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Card 1: Jadwal Selanjutnya (Besar - Papillon Style) */}
					<div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between hover:shadow-md transition">
						<div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
							<CalendarClock className="w-6 h-6" />
							<h2 className="font-semibold text-lg">Sekarang</h2>
						</div>
						<div>
							<p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
								Pemrograman Web
							</p>
							<p className="text-zinc-500 font-medium">
								Lab Komputer 2 • 08:00 - 10:30
							</p>
						</div>
					</div>

					{/* Card 2: Rata-rata Nilai */}
					<div className="bg-zinc-900 dark:bg-zinc-100 p-6 rounded-3xl flex flex-col justify-between text-white dark:text-zinc-900 hover:scale-[1.02] transition transform origin-center">
						<div className="flex items-center gap-2 mb-2 opacity-80">
							<GraduationCap className="w-5 h-5" />
							<h2 className="font-medium">Rata-rata</h2>
						</div>
						<div>
							<p className="text-5xl font-bold tracking-tighter">88.5</p>
							<p className="text-sm opacity-80 mt-2">+2.4 dari semester lalu</p>
						</div>
					</div>

					{/* Card 3: Tugas Mendatang */}
					<div className="md:col-span-1 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
						<div className="flex items-center gap-2 mb-4 text-orange-500">
							<BookOpen className="w-5 h-5" />
							<h2 className="font-semibold text-lg">Tugas Besok</h2>
						</div>
						<ul className="space-y-3">
							<li className="flex items-start gap-3">
								<div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
								<div>
									<p className="font-medium text-zinc-900 dark:text-zinc-100">
										UI/UX Figma
									</p>
									<p className="text-xs text-zinc-500">Batas: 23:59</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<div className="w-2 h-2 rounded-full bg-zinc-300 mt-2"></div>
								<div>
									<p className="font-medium text-zinc-900 dark:text-zinc-100">
										Laporan PKL
									</p>
									<p className="text-xs text-zinc-500">Batas: Lusa</p>
								</div>
							</li>
						</ul>
					</div>

					{/* Card 4: Quick Action / QR Absen */}
					<div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl flex items-center justify-between border border-blue-100 dark:border-blue-900/50">
						<div>
							<h2 className="font-semibold text-blue-900 dark:text-blue-100 text-lg mb-1">
								Siap untuk Absen?
							</h2>
							<p className="text-blue-700/80 dark:text-blue-200/80 text-sm">
								Scan QR code di meja guru.
							</p>
						</div>
						<button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium shadow-sm hover:bg-blue-700 transition">
							Buka Scanner
						</button>
					</div>
				</div>
			</div>
		</main>
	);
}
