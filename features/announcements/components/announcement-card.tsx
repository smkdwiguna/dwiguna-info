import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserDetails } from "@/features/workspace-admin/actions/get-user-details";
import { announcements } from "@/lib/db/announcement-schema";
import Link from "next/link";

export async function AnnouncementCard({
	announcement,
}: {
	announcement: typeof announcements.$inferSelect;
}) {
	return (
		<Link
			href={`/announcements/${announcement.id}`}
			className="block hover:scale-[0.99] transition-transform duration-200"
		>
			<Card key={announcement.id} className="flex flex-col">
				<CardHeader>
					<CardTitle className="line-clamp-2 flex font-bold items-center justify-between text-lg">
						{announcement.title}
						<div className="text-sm text-muted-foreground font-normal flex gap-1">
							<span>
								{
									(await getUserDetails(announcement.authorEmail)).name
										?.fullName
								}
							</span>
							<span>•</span>
							<span>
								{new Date(announcement.createdAt).toLocaleDateString("id-ID", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</span>
						</div>{" "}
					</CardTitle>
				</CardHeader>
				<CardContent
					className="grow prose dark:prose-invert line-clamp-3 focus:outline-none focus-within:ring-0 [&_.ProseMirror]:min-h-75 [&_.ProseMirror]:outline-none"
					dangerouslySetInnerHTML={{
						__html: announcement.content,
					}}
				></CardContent>
			</Card>
		</Link>
	);
}
