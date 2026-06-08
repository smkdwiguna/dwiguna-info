import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";
import { getLessons } from "@/features/academic/actions/lessons";
import { LessonManagement } from "@/features/academic/components/LessonManagement";
import { PageHeader } from "@/components/ui/page-header";

export default async function LessonsPage() {
	await requirePermissionOrRedirect("academic");
	const lessons = await getLessons();

	return (
		<div className="space-y-6">
			<PageHeader title="Mata Pelajaran & Kegiatan" />
			<LessonManagement initialLessons={lessons} />
		</div>
	);
}
