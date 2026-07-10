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
import { getUserDetails } from "@/features/workspace-admin/actions/get-user-details";

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

	const announcement = await getAnnouncement(id);

	if (!announcement) {
		notFound();
	}

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderBack />
					<PageHeaderTitle>{announcement.title}</PageHeaderTitle>
				</PageHeaderHeading>
			</PageHeader>
			<Card>
				<CardHeader>
					<CardTitle className="text-muted-foreground flex items-center justify-center text-sm text">
						{(await getUserDetails(announcement.authorEmail)).name?.fullName +
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
						className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words"
						dangerouslySetInnerHTML={{ __html: announcement.content }}
					/>
				</CardContent>
			</Card>
		</PageShell>
	);
}
