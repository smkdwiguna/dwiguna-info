import {
	getAllAnnouncements,
	getLiveAnnouncementPermission,
} from "@/features/announcements/actions/announcements";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
	PageHeader,
	PageHeaderHeading,
	PageHeaderTitle,
	PageHeaderActions,
	PageShell,
} from "@/components/ui/page-header";
import { AnnouncementCard } from "@/features/announcements/components/announcement-card";
import { AnnouncementFormDialog } from "@/features/announcements/components/announcement-form-dialog";

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
						<AnnouncementFormDialog>
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								Buat Pengumuman
							</Button>
						</AnnouncementFormDialog>
					</PageHeaderActions>
				)}
			</PageHeader>

			<div className="grid gap-4">
				{announcements.map((announcement) => (
					<AnnouncementCard
						key={announcement.id}
						announcement={announcement}
						authorName={announcement.authorName || announcement.authorEmail}
						canEdit={canCreate}
					/>
				))}
				{announcements.length === 0 && (
					<div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
						Belum ada pengumuman.
					</div>
				)}
			</div>
		</PageShell>
	);
}
