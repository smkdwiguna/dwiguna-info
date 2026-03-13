import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	title: "Dwiguna.Info",
	description: "Portal satu akun ekosistem SMK TI Dwiguna",
	icons: {
		icon: "/Logo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={cn(figtree.variable, "font-sans")}>
			<body className="antialiased">{children}</body>
		</html>
	);
}
