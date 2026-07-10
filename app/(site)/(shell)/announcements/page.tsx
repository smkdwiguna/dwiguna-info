import { getAllAnnouncements } from "@/features/announcements/actions/announcements";
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
import { getUserDetails } from "@/features/workspace-admin/actions/get-user-details";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

export default async function AnnouncementsPage() {
	const [announcements, { isSuperUser, permissions }] = await Promise.all([
		getAllAnnouncements(),
		getLivePermissions(),
	]);

	const canCreate = permissions.includes("announcement") || isSuperUser;

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Pengumuman</PageHeaderTitle>
				</PageHeaderHeading>
				{canCreate && (
					<PageHeaderActions>
						<AnnouncementFormDialog>
							<Button>Buat Pengumuman</Button>
						</AnnouncementFormDialog>
					</PageHeaderActions>
				)}
			</PageHeader>

			<div className="grid gap-4">
				{announcements.map(async (announcement) => (
					<AnnouncementCard
						key={announcement.id}
						announcement={announcement}
						authorName={
							(await getUserDetails(announcement.authorEmail))?.name
								?.fullName || announcement.authorEmail
						}
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
