import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

export default function Login() {
	const router = useRouter();
	return (
		<main className="min-h-svh bg-muted/40 flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6">
				<Image
					src="/SMK-TI-Dwiguna.png"
					alt="Logo SMK TI Dwiguna"
					className="text-center h-12 w-auto mx-auto"
					width={1219}
					height={195}
				/>

				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-xl">Dwiguna.Info</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<Button
							variant="outline"
							size="lg"
							className="w-full"
							onClick={() => router.replace("/login")}
						>
							Lanjutkan dengan akun smkdwiguna.sch.id
						</Button>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
