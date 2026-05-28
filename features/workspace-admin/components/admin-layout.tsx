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
	Clock,
	Shield,
	LinkIcon,
	ShelvingUnit,
} from "lucide-react";
import Link from "next/link";
import Logout from "@/components/logout";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSuperUser } from "@/lib/access";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/spinner";
import { BrandLogo } from "@/components/brand-logo";
import { toast } from "sonner";
import { CreditsDialog } from "@/components/credits-dialog";

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
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [livePermissions, setLivePermissions] = useState<string[]>(["loading"]);
	const [inventoryEntries, setInventoryEntries] = useState<
		{ id: number; name: string }[]
	>([]);
	const [isSidebarLoading, setIsSidebarLoading] = useState(true);

	useEffect(() => {
		const flash = searchParams.get("flash");
		if (flash) {
			toast.error(flash);
			const next = new URLSearchParams(searchParams.toString());
			next.delete("flash");
			const query = next.toString();
			router.replace(query ? `${pathname}?${query}` : pathname);
		}

		if (!userEmail) return;
		let active = true;
		setIsSidebarLoading(true);
		(async () => {
			try {
				const { getLivePermissions } =
					await import("@/features/workspace-admin/actions/require-permission");
				const result = await getLivePermissions();
				if (active && !result.isSuperUser) {
					setLivePermissions(result.permissions);
				}

				const invModule =
					await import("@/features/inventory/actions/inventory");
				if (active && typeof invModule.getInventories === "function") {
					const inventories = await invModule.getInventories();
					const entries = inventories.map((inv) => ({
						id: inv.id,
						name: inv.name,
					}));
					setInventoryEntries(entries);
				}
			} catch {
				if (active) {
					setInventoryEntries([]);
					setLivePermissions(permissions ?? []);
				}
			} finally {
				if (active) {
					setIsSidebarLoading(false);
				}
			}
		})();
		return () => {
			active = false;
		};
	}, [userEmail, permissions, pathname, router, searchParams]);

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
					inventoryEntries={inventoryEntries}
					isSidebarLoading={isSidebarLoading}
					permissions={livePermissions}
				/>
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
	inventoryEntries,
	isSidebarLoading,
	permissions,
}: {
	isSuperUser: boolean;
	inventoryEntries: { id: number; name: string }[];
	isSidebarLoading: boolean;
	permissions: string[];
}) {
	const showInventoryMenu =
		isSuperUser ||
		permissions.includes("inventory") ||
		inventoryEntries.length > 0;

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
								<Link href="/shortlinks">
									<LinkIcon />
									<span>Tautan Singkat</span>
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
						</>
					)}

					{showInventoryMenu && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Inventaris">
								<Link href="/inventory">
									<ShelvingUnit />
									<span>Inventaris</span>
								</Link>
							</SidebarMenuButton>
							{inventoryEntries.length > 0 && (
								<SidebarMenuSub>
									{inventoryEntries.map((entry) => (
										<SidebarMenuSubItem key={entry.id}>
											<SidebarMenuSubButton asChild>
												<Link href={`/inventory/${entry.id}`}>
													<span>{entry.name}</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									))}
								</SidebarMenuSub>
							)}
						</SidebarMenuItem>
					)}
				</SidebarMenu>
				{!isSuperUser && isSidebarLoading && (
					<div className="text-center pt-2">
						<Spinner variant="muted" />
					</div>
				)}
			</SidebarContent>
			<SidebarFooter className="p-4">
				<div className="flex justify-center">
					<CreditsDialog />
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
