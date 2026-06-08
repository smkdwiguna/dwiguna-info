import { requirePermissionOrRedirect } from "@/features/access-management/actions/require-permission";
import { getTeacherAssignments } from "@/features/academic/actions/assignments";
import { getLessons } from "@/features/academic/actions/lessons";
import { fetchAllOrgUnits } from "@/lib/google-api";
import { TeacherAssignment } from "@/features/academic/components/TeacherAssignment";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { GraduationCap, Calendar, FileSpreadsheet, Users } from "lucide-react";

export default async function AcademicPage() {
	await requirePermissionOrRedirect("academic");

	const [assignments, lessons, orgUnits] = await Promise.all([
		getTeacherAssignments(),
		getLessons(),
		fetchAllOrgUnits(),
	]);

	const menuItems = [
		{
			title: "Jadwal",
			description: "Atur jadwal pelajaran dan kegiatan",
			href: "/academic/timetable",
			icon: Calendar,
		},
		{
			title: "Penilaian",
			description: "Input nilai siswa",
			href: "/academic/grading",
			icon: FileSpreadsheet,
		},
		{
			title: "Mata Pelajaran",
			description: "Kelola daftar mata pelajaran",
			href: "/academic/lessons",
			icon: GraduationCap,
		},
	];

	return (
		<div className="space-y-8">
			<PageHeader title="Akademik" />

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{menuItems.map((item) => (
					<Link key={item.title} href={item.href}>
						<Card className="hover:bg-muted/50 transition-colors h-full cursor-pointer">
							<CardHeader className="flex flex-row items-center gap-4">
								<div className="p-2 bg-primary/10 rounded-lg">
									<item.icon className="w-6 h-6 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg">{item.title}</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">{item.description}</p>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			<div className="space-y-4">
				<h2 className="text-2xl font-bold flex items-center gap-2">
					<Users className="w-6 h-6" /> Administrasi Guru
				</h2>
				<TeacherAssignment
					initialAssignments={assignments}
					lessons={lessons}
					orgUnits={orgUnits}
				/>
			</div>
		</div>
	);
}
