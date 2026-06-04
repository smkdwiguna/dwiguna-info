import { getServerSession } from "@/lib/server-session";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getHighResPeoplePhotoUrl } from "@/lib/google-people-photo";

export default async function DashboardPage() {
	const session = await getServerSession();

	if (!session?.user) return null;

	const { user } = session;

	const photo = await getHighResPeoplePhotoUrl(user.email);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<div className="flex items-start gap-4">
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
						<div className="flex flex-col pt-0.5">
							<CardTitle className="text-xl font-bold">
								Halo, {user.name}!
							</CardTitle>
							<CardDescription>{user.email}</CardDescription>
						</div>
					</div>
				</CardHeader>
			</Card>
		</div>
	);
}
