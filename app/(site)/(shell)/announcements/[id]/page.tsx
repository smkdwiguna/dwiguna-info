import { getAnnouncement } from "@/features/announcements/actions/announcements";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	PageHeader,
	PageHeaderBack,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";
import { AnnouncementActionButtons } from "@/features/announcements/components/announcement-action-buttons";
import { getUserDetails } from "@/features/workspace-admin/actions/get-user-details";
import { getLivePermissions } from "@/features/access-management/actions/require-permission";

export default async function AnnouncementDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const resolvedParams = await params;
	const id = parseInt(resolvedParams.id, 10);
	if (isNaN(id)) {
		notFound();
	}

	const [announcement, { isSuperUser, permissions }] = await Promise.all([
		getAnnouncement(id),
		getLivePermissions(),
	]);

	const canEdit = permissions.includes("announcement") || isSuperUser;

	if (!announcement) {
		notFound();
	}

	return (
		<PageShell>
			<div className="flex justify-between items-start gap-4">
				<PageHeader className="grow">
					<PageHeaderHeading>
						<PageHeaderBack />
						<PageHeaderTitle className="wrap-break-word">
							{announcement.title}
						</PageHeaderTitle>
					</PageHeaderHeading>
				</PageHeader>
				{canEdit && <AnnouncementActionButtons announcement={announcement} />}
			</div>

			<Card>
				<CardHeader>
					<CardTitle
						suppressHydrationWarning
						className="text-muted-foreground flex items-center text-sm text font-normal"
					>
						{(await getUserDetails(announcement.authorEmail))?.name?.fullName +
							" • " +
							new Date(announcement.createdAt).toLocaleDateString("id-ID", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className="prose prose-sm sm:prose-base dark:prose-invert max-w-none wrap-break-word"
						dangerouslySetInnerHTML={{ __html: announcement.content }}
					/>
				</CardContent>
			</Card>
		</PageShell>
	);
}
