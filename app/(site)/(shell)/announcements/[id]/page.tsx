import { getAnnouncement } from "@/features/announcements/actions/announcements";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
		<div className="space-y-6 max-w-4xl mx-auto">
			<Link href="/announcements">
				<Button variant="ghost" className="mb-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Kembali ke Daftar
				</Button>
			</Link>

			<Card>
				<CardHeader>
					<CardTitle className="text-3xl font-bold">
						{announcement.title}
					</CardTitle>
					<div className="text-sm text-muted-foreground flex gap-2 pt-2">
						<span>{announcement.authorEmail}</span>
						<span>•</span>
						<span>
							{new Date(announcement.createdAt).toLocaleDateString("id-ID", {
								year: "numeric",
								month: "long",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<div
						className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words"
						dangerouslySetInnerHTML={{ __html: announcement.content }}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
