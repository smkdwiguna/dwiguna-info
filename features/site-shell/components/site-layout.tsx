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
import { getLivePermissions } from "@/features/access-management/actions/require-permission";
import { cn } from "@/lib/utils";

interface SiteLayoutProps {
	children: React.ReactNode;
	userEmail?: string;
	permissions?: string[];
}

export function SiteLayout({
	children,
	userEmail,
	permissions,
}: SiteLayoutProps) {
	const superUser = isSuperUser(userEmail);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [livePermissions, setLivePermissions] = useState<string[]>(["loading"]);
	const [inventoryEntries, setInventoryEntries] = useState<
		{ id: number; name: string }[]
	>([]);
	const [isSidebarLoading, setIsSidebarLoading] = useState(true);
	const [isRoutePending, setIsRoutePending] = useState(false);
	const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
	const isShellBusy = isSidebarLoading || isRoutePending;

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

	useEffect(() => {
		setIsRoutePending(false);
	}, [pathname, searchParams]);

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
					isShellBusy={isShellBusy}
					currentPath={currentPath}
					onNavigate={() => setIsRoutePending(true)}
					permissions={livePermissions}
				/>
				<SidebarInset>
					<header className="flex z-50 h-16 sticky top-0 bg-background shrink-0 items-center gap-2 border-b px-5.5">
						<div className="w-full flex gap-3 items-center justify-start">
							<SidebarTrigger disabled={isShellBusy} />
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
					<main
						className={cn(
							"flex flex-1 flex-col gap-4 bg-muted/20 p-4 md:p-6",
							isRoutePending && "items-center justify-center",
						)}
						aria-busy={isRoutePending}
					>
						{isRoutePending ? (
							<Spinner className="h-full w-full" size={96} variant="muted" />
						) : (
							children
						)}
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
	isShellBusy,
	currentPath,
	onNavigate,
	permissions,
}: {
	isSuperUser: boolean;
	inventoryEntries: { id: number; name: string }[];
	isSidebarLoading: boolean;
	isShellBusy: boolean;
	currentPath: string;
	onNavigate: () => void;
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
							<ShellNavLink
								href="/"
								isShellBusy={isShellBusy}
								currentPath={currentPath}
								onNavigate={onNavigate}
							>
								<LayoutDashboard />
								<span>Dasbor</span>
							</ShellNavLink>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{(isSuperUser || permissions.includes("users")) && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Pengguna">
								<ShellNavLink
									href="/users"
									isShellBusy={isShellBusy}
									currentPath={currentPath}
									onNavigate={onNavigate}
								>
									<Users />
									<span>Pengguna</span>
								</ShellNavLink>
							</SidebarMenuButton>
							<SidebarMenuSub>
								<SidebarMenuSubItem>
									<SidebarMenuSubButton asChild>
										<ShellNavLink
											href="/bulk-upload"
											isShellBusy={isShellBusy}
											currentPath={currentPath}
											onNavigate={onNavigate}
										>
											<span>Tambah Pengguna</span>
										</ShellNavLink>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							</SidebarMenuSub>
						</SidebarMenuItem>
					)}

					{(isSuperUser || permissions.includes("shortlink")) && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Tautan">
								<ShellNavLink
									href="/shortlinks"
									isShellBusy={isShellBusy}
									currentPath={currentPath}
									onNavigate={onNavigate}
								>
									<LinkIcon />
									<span>Tautan Singkat</span>
								</ShellNavLink>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}

					{isSuperUser && (
						<>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Akses">
									<ShellNavLink
										href="/access"
										isShellBusy={isShellBusy}
										currentPath={currentPath}
										onNavigate={onNavigate}
									>
										<Shield />
										<span>Akses</span>
									</ShellNavLink>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Kehadiran (Presensi)">
									<ShellNavLink
										href="/presence"
										isShellBusy={isShellBusy}
										currentPath={currentPath}
										onNavigate={onNavigate}
									>
										<Clock />
										<span>Presensi</span>
									</ShellNavLink>
								</SidebarMenuButton>
								<SidebarMenuSub>
									<SidebarMenuSubItem>
										<SidebarMenuSubButton asChild>
											<ShellNavLink
												href="/presence/sheets"
												isShellBusy={isShellBusy}
												currentPath={currentPath}
												onNavigate={onNavigate}
											>
												<span>Lembar Kehadiran</span>
											</ShellNavLink>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
									<SidebarMenuSubItem>
										<SidebarMenuSubButton asChild>
											<ShellNavLink
												href="/presence/terminals"
												isShellBusy={isShellBusy}
												currentPath={currentPath}
												onNavigate={onNavigate}
											>
												<span>Terminal</span>
											</ShellNavLink>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
									<SidebarMenuSubItem>
										<SidebarMenuSubButton asChild>
											<ShellNavLink
												href="/presence/device-users"
												isShellBusy={isShellBusy}
												currentPath={currentPath}
												onNavigate={onNavigate}
											>
												<span>Sidik Jari</span>
											</ShellNavLink>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								</SidebarMenuSub>
							</SidebarMenuItem>
						</>
					)}

					{showInventoryMenu && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Inventaris">
								<ShellNavLink
									href="/inventory"
									isShellBusy={isShellBusy}
									currentPath={currentPath}
									onNavigate={onNavigate}
								>
									<ShelvingUnit />
									<span>Inventaris</span>
								</ShellNavLink>
							</SidebarMenuButton>
							{inventoryEntries.length > 0 && (
								<SidebarMenuSub>
									{inventoryEntries.map((entry) => (
										<SidebarMenuSubItem key={entry.id}>
											<SidebarMenuSubButton asChild>
												<ShellNavLink
													href={`/inventory/${entry.id}`}
													isShellBusy={isShellBusy}
													currentPath={currentPath}
													onNavigate={onNavigate}
												>
													<span>{entry.name}</span>
												</ShellNavLink>
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
			<SidebarRail disabled={isShellBusy} />
		</Sidebar>
	);
}

function ShellNavLink({
	href,
	isShellBusy,
	currentPath,
	onNavigate,
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Link> & {
	isShellBusy: boolean;
	currentPath: string;
	onNavigate: () => void;
}) {
	const targetPath = typeof href === "string" ? href : href.toString();
	const isCurrent = targetPath === currentPath;
	const disabled = isShellBusy;

	return (
		<Link
			href={href}
			aria-disabled={disabled || undefined}
			tabIndex={disabled ? -1 : props.tabIndex}
			className={cn(className, disabled && "pointer-events-none cursor-wait")}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (disabled) {
					event.preventDefault();
					return;
				}
				if (
					event.metaKey ||
					event.ctrlKey ||
					event.shiftKey ||
					event.altKey ||
					event.button !== 0 ||
					isCurrent
				) {
					return;
				}
				onNavigate();
			}}
			{...props}
		/>
	);
}
