import { getLivePermissions, redirectToDashboardWithFlash } from "@/features/access-management/actions/require-permission";
import { getLessons } from "@/features/academic/actions/lessons";
import { getLessonsForTeacher } from "@/features/academic/actions/assignments";
import { fetchAllOrgUnits, fetchAllWorkspaceUsers } from "@/lib/google-api";
import { GradingGrid } from "@/features/academic/components/GradingGrid";
import { PageHeader } from "@/components/ui/page-header";

export default async function GradingPage() {
	const { session, permissions, isSuperUser } = await getLivePermissions();
	if (!session?.user) return null;

	const userEmail = session.user.email;
	const isTeacher = userEmail.toLowerCase().includes("/guru");

	let availableLessons: any[] = [];
	let availableOrgUnits: string[] = [];

	if (isSuperUser || permissions.includes("academic")) {
		availableLessons = await getLessons();
		availableOrgUnits = await fetchAllOrgUnits();
	} else if (isTeacher) {
		const assignments = await getLessonsForTeacher(userEmail);
		const lessonMap = new Map();
		const ouSet = new Set<string>();
		assignments.forEach((a) => {
			lessonMap.set(a.lessonId, { id: a.lessonId, name: a.lessonName });
			ouSet.add(a.orgUnitPath);
		});
		availableLessons = Array.from(lessonMap.values());
		availableOrgUnits = Array.from(ouSet);
	} else {
		await redirectToDashboardWithFlash("Halaman ini hanya untuk Guru dan Admin.");
		return null;
	}

	if (availableLessons.length === 0) {
		await redirectToDashboardWithFlash("Anda belum memiliki penugasan mata pelajaran.");
		return null;
	}

	const allUsers = await fetchAllWorkspaceUsers();
	const studentsByOrgUnit: Record<string, any[]> = {};
	allUsers.forEach((u) => {
		if (u.orgUnitPath) {
			if (!studentsByOrgUnit[u.orgUnitPath]) {
				studentsByOrgUnit[u.orgUnitPath] = [];
			}
			studentsByOrgUnit[u.orgUnitPath].push(u);
		}
	});

	return (
		<div className="space-y-6">
			<PageHeader title="Penilaian (Grading)" />
			<GradingGrid
				lessons={availableLessons}
				allOrgUnits={availableOrgUnits}
				studentsByOrgUnit={studentsByOrgUnit}
			/>
		</div>
	);
}
