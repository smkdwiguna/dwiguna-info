import {
	getAllAnnouncements,
	getLiveAnnouncementPermission,
} from "@/features/announcements/actions/announcements";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
	PageHeader,
	PageHeaderHeading,
	PageHeaderTitle,
	PageHeaderActions,
	PageShell,
} from "@/components/ui/page-header";
import { AnnouncementCard } from "@/features/announcements/components/announcement-card";

export default async function AnnouncementsPage() {
	const [announcements, { canCreate }] = await Promise.all([
		getAllAnnouncements(),
		getLiveAnnouncementPermission(),
	]);

	return (
		<PageShell>
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
				{announcements.map((announcement) => (
					<AnnouncementCard key={announcement.id} announcement={announcement} />
				))}
			</div>
		</PageShell>
	);
}
