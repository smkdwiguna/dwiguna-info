import { BulkUploadClient } from "@/features/workspace-admin/components/bulk-upload-client";
import { requirePermissionOrRedirect } from "@/features/workspace-admin/actions/require-permission";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
	await requirePermissionOrRedirect("users");
	return <BulkUploadClient />;
}
