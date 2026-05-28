import { getServerSession } from "@/lib/server-session";
import { AdminLayout } from "@/features/workspace-admin/components/admin-layout";
import Login from "@/components/login";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session) {
		return <Login />;
	}

	return <AdminLayout userEmail={session.user.email}>{children}</AdminLayout>;
}
