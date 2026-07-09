import {
	getAllAnnouncements,
	getLiveAnnouncementPermission,
} from "@/features/announcements/actions/announcements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader, PageHeaderHeading, PageHeaderTitle, PageHeaderActions } from "@/components/ui/page-header";

export default async function AnnouncementsPage() {
	const [announcements, { canCreate }] = await Promise.all([
		getAllAnnouncements(),
		getLiveAnnouncementPermission(),
	]);

	return (
		<div className="space-y-6">
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Pengumuman</PageHeaderTitle>
				</PageHeaderHeading>
				{canCreate && (
					<PageHeaderActions>
						<Link href="/announcements/create">
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								Buat Pengumuman
							</Button>
						</Link>
					</PageHeaderActions>
				)}
			</PageHeader>

			<div className="grid gap-4">
				{announcements.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							Belum ada pengumuman.
						</CardContent>
					</Card>
				) : (
					announcements.map((announcement) => (
						<Card key={announcement.id}>
							<CardHeader>
								<CardTitle>
									<Link
										href={`/announcements/${announcement.id}`}
										className="hover:underline"
									>
										{announcement.title}
									</Link>
								</CardTitle>
								<div className="text-sm text-muted-foreground flex gap-2">
									<span>{announcement.authorEmail}</span>
									<span>•</span>
									<span>
										{new Date(announcement.createdAt).toLocaleDateString("id-ID", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</span>
								</div>
							</CardHeader>
							<CardContent>
								{/* Extract text from HTML, or just show raw string if small. Safely stripping HTML here for a preview. */}
								<p className="line-clamp-2 text-muted-foreground">
									{announcement.content.replace(/<[^>]*>?/gm, "")}
								</p>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
