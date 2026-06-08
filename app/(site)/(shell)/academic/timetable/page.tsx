import { getLivePermissions } from "@/features/access-management/actions/require-permission";
import { getTimetable } from "@/features/academic/actions/timetable";
import { getLessons } from "@/features/academic/actions/lessons";
import { fetchAllOrgUnits } from "@/lib/google-api";
import { TimetableGrid } from "@/features/academic/components/TimetableGrid";
import { PageHeader } from "@/components/ui/page-header";

export default async function TimetablePage() {
	const { session } = await getLivePermissions();
	if (!session?.user) return null;

	const orgUnits = await fetchAllOrgUnits();
	const lessons = await getLessons();
	const timetable = await getTimetable();

	return (
		<div className="space-y-6">
			<PageHeader title="Jadwal Pelajaran & Kegiatan" />
			<TimetableGrid
				initialTimetable={timetable}
				lessons={lessons}
				orgUnits={orgUnits}
			/>
		</div>
	);
}
