import { useRouter } from "next/navigation";

export default function Login({ isSso }: { isSso: boolean }) {
	const router = useRouter();
	return (
		<main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
			<div className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-sm border border-zinc-100 text-center">
				<div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-6 shadow-inner flex items-center justify-center">
					<span className="text-white font-bold text-2xl">D</span>
				</div>

				<h1 className="text-2xl font-bold text-zinc-900 mb-2">Dwiguna.Info</h1>
				<p className="text-sm text-zinc-500 mb-8">
					Satu akun ekosistem SMK TI Dwiguna
				</p>

				<button
					onClick={() => router.replace("/login" + (isSso ? "?sso" : ""))}
					className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-800 font-medium py-3 px-4 rounded-xl hover:bg-zinc-50 hover:shadow-sm transition-all disabled:opacity-50"
				>
					Lanjutkan SSO dengan Google
				</button>
			</div>
		</main>
	);
}
