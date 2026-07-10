import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";
import { BulkUploadClient } from "@/features/workspace-admin/components/bulk-upload-client";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
	await requirePermissionOrRedirect("users");
	return <BulkUploadClient />;
}
