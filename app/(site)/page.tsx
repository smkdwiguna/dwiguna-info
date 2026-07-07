import { getServerSession } from "@/lib/server-session";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getHighResPeoplePhotoUrl } from "@/lib/google-people-photo";
import { Button } from "@/components/ui/button";
import { getAccountPassByEmail } from "@/features/account-passes/actions";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreditCardIcon } from "lucide-react";

export default async function DashboardPage() {
	const session = await getServerSession();

	if (!session?.user) return null;

	const { user } = session;

	const photo = await getHighResPeoplePhotoUrl(user.email);
	const accountPass = await getAccountPassByEmail(user.email);

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
						<div className="flex justify-between w-full gap-2">
							<div className="flex flex-col pt-0.5">
								<CardTitle className="text-xl font-bold">
									Halo, {user.name}!
								</CardTitle>
								<CardDescription>{user.email}</CardDescription>
							</div>
							{accountPass && (
								<div>
									<Dialog>
										<DialogTrigger asChild>
											<Button variant="outline" size="icon">
												<CreditCardIcon />
											</Button>
										</DialogTrigger>
										<DialogContent>{/* TODO */}</DialogContent>
									</Dialog>
								</div>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>
		</div>
	);
}
