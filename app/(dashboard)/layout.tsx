import { getServerSession } from "@/lib/server-session";
import { AdminLayout } from "@/features/workspace-admin/components/admin-layout";
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

	return <AdminLayout userEmail={userEmail}>{children}</AdminLayout>;
}
