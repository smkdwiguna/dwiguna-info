"use client";

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
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	Users,
	LayoutDashboard,
	Settings,
	Clock,
	Shield,
	LinkIcon,
} from "lucide-react";
import Link from "next/link";
import Logout from "@/components/logout";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSuperUser } from "@/lib/access";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/spinner";
import { BrandLogo } from "@/components/brand-logo";

interface AdminLayoutProps {
	children: React.ReactNode;
	userEmail?: string;
	permissions?: string[];
}

export function AdminLayout({
	children,
	userEmail,
	permissions,
}: AdminLayoutProps) {
	const superUser = isSuperUser(userEmail);
	const [livePermissions, setLivePermissions] = useState<string[]>(["loading"]);

	useEffect(() => {
		if (!userEmail) return;
		let active = true;
		(async () => {
			try {
				const { getLivePermissions } =
					await import("@/features/workspace-admin/actions/require-permission");
				const result = await getLivePermissions();
				if (active && !result.isSuperUser) {
					setLivePermissions(result.permissions);
				}
			} catch {
				if (active) {
					setLivePermissions(permissions ?? []);
				}
			}
		})();
		return () => {
			active = false;
		};
	}, [userEmail, permissions]);

	return (
		<TooltipProvider>
			<SidebarProvider
				style={
					{
						"--sidebar-width": "14rem",
					} as React.CSSProperties
				}
			>
				<AppSidebar isSuperUser={superUser} permissions={livePermissions} />
				<SidebarInset>
					<header className="flex z-50 h-16 sticky top-0 bg-background shrink-0 items-center gap-2 border-b px-5.5">
						<div className="w-full flex gap-3 items-center justify-start">
							<SidebarTrigger />
							<BrandLogo
								priority
								className="h-8 w-fit"
								imageClassName="h-8 w-auto"
								width={250}
								height={40}
							/>
						</div>
						<ThemeToggle />
						<Logout />
					</header>
					<main className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-muted/20">
						{children}
					</main>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}

function AppSidebar({
	isSuperUser,
	permissions,
}: {
	isSuperUser: boolean;
	permissions: string[];
}) {
	return (
		<Sidebar>
			<SidebarHeader />
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
					{!isSuperUser && permissions.includes("loading") && (
						<div className="text-center pt-2">
							<Spinner variant="muted" />
						</div>
					)}
					{(isSuperUser || permissions.includes("users")) && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Pengguna">
								<Link href="/users">
									<Users />
									<span>Pengguna</span>
								</Link>
							</SidebarMenuButton>
							<SidebarMenuSub>
								<SidebarMenuSubItem>
									<SidebarMenuSubButton asChild>
										<Link href="/bulk-upload">
											<span>Tambah Pengguna</span>
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							</SidebarMenuSub>
						</SidebarMenuItem>
					)}

					{(isSuperUser || permissions.includes("shortlink")) && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Tautan">
								<Link href="/shortlink">
									<LinkIcon />
									<span>Tautan</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}

					{isSuperUser && (
						<>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Akses">
									<Link href="/access">
										<Shield />
										<span>Akses</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Kehadiran (Presensi)">
									<Link href="/presence">
										<Clock />
										<span>Presensi</span>
									</Link>
								</SidebarMenuButton>
								<SidebarMenuSub>
									<SidebarMenuSubItem>
										<SidebarMenuSubButton asChild>
											<Link href="/presence/sheets">
												<span>Lembar Kehadiran</span>
											</Link>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
									<SidebarMenuSubItem>
										<SidebarMenuSubButton asChild>
											<Link href="/presence/terminals">
												<span>Terminal</span>
											</Link>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
									<SidebarMenuSubItem>
										<SidebarMenuSubButton asChild>
											<Link href="/presence/device-users">
												<span>Sidik Jari</span>
											</Link>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								</SidebarMenuSub>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Pengaturan">
									<Link href="/settings">
										<Settings />
										<span>Pengaturan</span>
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
