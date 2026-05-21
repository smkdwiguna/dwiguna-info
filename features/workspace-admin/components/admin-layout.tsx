import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
	SidebarInset,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Users, Upload, LayoutDashboard, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Logout from "@/components/logout";

interface AdminLayoutProps {
	children: React.ReactNode;
	userEmail?: string;
}

export function AdminLayout({ children, userEmail }: AdminLayoutProps) {
	const isAdmin = userEmail === "proktor@smkdwiguna.sch.id";

	return (
		<TooltipProvider>
			<SidebarProvider
				style={
					{
						"--sidebar-width": "13rem",
					} as React.CSSProperties
				}
			>
				<AppSidebar isAdmin={isAdmin} />
				<SidebarInset>
					<header className="flex h-16 shrink-0 items-center gap-2 border-b px-5.5">
						<SidebarTrigger className="-ml-1" />
						<div className="w-full flex justify-end">
							<Logout />
						</div>
					</header>
					<main className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-muted/20">
						{children}
					</main>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}

function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
	return (
		<Sidebar>
			<SidebarHeader className="p-4 flex flex-row items-center gap-3">
				<Image
					src="/Logo.png"
					alt="Logo"
					width={40}
					height={40}
					className="h-8 w-8"
				/>
				<span className="font-bold text-lg">Dwiguna.Info</span>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild tooltip="Dasbor">
							<Link href="/">
								<LayoutDashboard />
								<span>Dasbor</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>

					{isAdmin && (
						<>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Pengguna">
									<Link href="/users">
										<Users />
										<span>Pengguna</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Bulk Upload">
									<Link href="/bulk-upload">
										<Upload />
										<span>Bulk Upload</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Settings">
									<Link href="/settings">
										<Settings />
										<span>Settings</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</>
					)}
				</SidebarMenu>
			</SidebarContent>
			<SidebarFooter className="p-4">
				<p className="text-xs text-muted-foreground text-center">
					&copy; 2026 SMK TI Dwiguna
				</p>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
