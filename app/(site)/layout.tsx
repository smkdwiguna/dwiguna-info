import { getServerSession } from "@/lib/server-session";
import { SiteLayout } from "@/features/site-shell/components/site-layout";
import Login from "@/components/login";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();
	const userEmail = session?.user?.email;

	if (!userEmail) {
		return <Login />;
	}

	return <SiteLayout userEmail={userEmail}>{children}</SiteLayout>;
}
