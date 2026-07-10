import { getServerSession } from "@/lib/server-session";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getHighResPeoplePhotoUrl } from "@/lib/google-people-photo";
import { Button } from "@/components/ui/button";
import { getAccountPassByEmail } from "@/features/account-passes/actions";
import { getLatestAnnouncements } from "@/features/announcements/actions/announcements";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCardIcon, DownloadIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CardContent } from "@/components/ui/card";
import { AnnouncementCard } from "@/features/announcements/components/announcement-card";
import { getUserDetails } from "@/features/workspace-admin/actions/get-user-details";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

export default async function DashboardPage() {
	const session = await getServerSession();

	if (!session?.user) return null;

	const { user } = session;
	const photo = await getHighResPeoplePhotoUrl(user.email);
	const accountPass = await getAccountPassByEmail(user.email);
	const encodedEmail = encodeURIComponent(user.email);
	const passPdfUrl = `/api/account-passes/${encodedEmail}/pdf`;
	const passSides = [
		accountPass?.frontDriveFileId
			? {
					label: "Depan",
					src: `/api/account-passes/${encodedEmail}/file?side=front`,
				}
			: null,
		accountPass?.backDriveFileId
			? {
					label: "Belakang",
					src: `/api/account-passes/${encodedEmail}/file?side=back`,
				}
			: null,
	].filter((side): side is { label: string; src: string } => Boolean(side));

	const [latestAnnouncements, { isSuperUser, permissions }] = await Promise.all(
		[getLatestAnnouncements(3), getLivePermissions()],
	);

	const canEdit = permissions.includes("announcement") || isSuperUser;

	return (
		<div className="space-y-4">
			<Card>
				<div className="flex items-center px-4 gap-4">
					<Avatar className="size-14">
						<AvatarImage
							referrerPolicy="no-referrer"
							src={photo ? photo : (user.image ?? undefined)}
							alt={user.name || user.email}
						/>
						<AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
							{user.name?.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex justify-between w-full gap-2">
						<div className="flex flex-col pt-0.5">
							<CardTitle className="text-xl font-bold">
								Halo, {user.name}!
							</CardTitle>
							<CardDescription>{user.email}</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Dialog>
								<DialogTrigger asChild>
									<Button
										variant="outline"
										aria-label="Buka kartu"
										suppressHydrationWarning
									>
										<span
											suppressHydrationWarning
											className="pointer-events-none"
										>
											<CreditCardIcon />
										</span>
										<span className="sr-only">Buka kartu</span>
									</Button>
								</DialogTrigger>
								<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
									<DialogHeader>
										<div className="flex flex-wrap items-start justify-between gap-2 pr-8">
											<div className="space-y-1">
												<DialogTitle>Kartu</DialogTitle>
											</div>
										</div>
									</DialogHeader>
									<div
										className={
											passSides.length > 1
												? "grid gap-3 grid-cols-2"
												: "grid gap-3"
										}
									>
										{passSides.map((side) => (
											<figure key={side.label} className="space-y-2">
												<div className="aspect-[1/1.52] overflow-hidden rounded-lg border bg-muted">
													<Image
														src={side.src}
														alt={`Kartu ${side.label.toLowerCase()} ${user.name || user.email}`}
														className="h-full w-full object-contain"
														loading="lazy"
														width={504}
														height={800}
														sizes={
															passSides.length > 1
																? "(min-width: 768px) 50vw, 100vw"
																: "100vw"
														}
														unoptimized
													/>
												</div>
											</figure>
										))}
									</div>
									<DialogFooter>
										<Button asChild variant="outline">
											<a href={passPdfUrl} target="_blank" rel="noreferrer">
												<DownloadIcon />
												<span>Unduh PDF</span>
											</a>
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</div>
			</Card>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold tracking-tight">
						Pengumuman Terbaru
					</h2>
					<Link href="/announcements">
						<Button variant="ghost" size="sm" className="gap-2">
							<span>Lihat Semua</span>
							<ArrowRight className="h-4 w-4" />
						</Button>
					</Link>
				</div>

				<div className="grid gap-4">
					{latestAnnouncements.length === 0 ? (
						<Card className="col-span-full">
							<CardContent className="py-8 text-center text-muted-foreground">
								Belum ada pengumuman.
							</CardContent>
						</Card>
					) : (
						latestAnnouncements.map(async (announcement) => (
							<AnnouncementCard
								key={announcement.id}
								announcement={announcement}
								authorName={
									(await getUserDetails(announcement.authorEmail))?.name
										?.fullName || announcement.authorEmail
								}
								canEdit={canEdit}
							/>
						))
					)}
				</div>
			</div>
		</div>
	);
}
