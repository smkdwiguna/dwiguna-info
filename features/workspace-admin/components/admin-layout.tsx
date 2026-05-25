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
import { Users, LayoutDashboard, Settings, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Logout from "@/components/logout";
import { hasPermission, isSuperUser } from "@/lib/access";

interface AdminLayoutProps {
	children: React.ReactNode;
	userEmail?: string;
	userAccess?: string;
}

export function AdminLayout({ children, userEmail, userAccess }: AdminLayoutProps) {
	const superUser = isSuperUser(userEmail);
	const canManageUsers = superUser || hasPermission(userAccess, "users");

	return (
		<TooltipProvider>
			<SidebarProvider
				style={
					{
						"--sidebar-width": "14rem",
					} as React.CSSProperties
				}
			>
				<AppSidebar
					isSuperUser={superUser}
					canManageUsers={canManageUsers}
				/>
				<SidebarInset>
					<header className="flex h-16 shrink-0 items-center gap-2 border-b px-5.5">
						<SidebarTrigger className="-ml-1" />
						<div className="w-full flex gap-2 items-center justify-center">
							<Image
								src="/Logo.png"
								alt="Logo"
								width={40}
								height={40}
								className="h-8 w-8"
							/>
						</div>
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
	canManageUsers,
}: {
	isSuperUser: boolean;
	canManageUsers: boolean;
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

					{canManageUsers && (
						<>
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
						</>
					)}

					{isSuperUser && (
						<>
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
