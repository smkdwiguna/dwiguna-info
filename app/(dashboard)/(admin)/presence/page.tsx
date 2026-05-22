import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	deviceUsers,
	presenceLogs,
	presencePoints,
	schedules,
	sheetTargets,
} from "@/lib/db/schema";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PresenceDashboardPage() {
	return (
		<div className="space-y-4">
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<PresenceDashboard />
			</Suspense>
		</div>
	);
}

function formatDateRange(dates: string[]) {
	if (dates.length === 0) return "Belum ada jadwal";
	const sorted = [...dates].sort();
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	return first === last ? first : `${first} s/d ${last}`;
}

function formatTimestamp(value: number) {
	const normalized = value < 10_000_000_000 ? value * 1000 : value;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString("id-ID");
}

async function PresenceDashboard() {
	try {
		const db = await getDb();
		const [
			allSheets,
			allSchedules,
			allTargets,
			allPoints,
			allLogs,
			allDeviceUsers,
		] = await Promise.all([
			db.select().from(attendanceSheets).all(),
			db.select().from(schedules).all(),
			db.select().from(sheetTargets).all(),
			db.select().from(presencePoints).all(),
			db.select().from(presenceLogs).all(),
			db.select().from(deviceUsers).all(),
		]);

		const scheduleBySheet = new Map<number, string[]>();
		for (const schedule of allSchedules) {
			const list = scheduleBySheet.get(schedule.sheetId) || [];
			list.push(schedule.date);
			scheduleBySheet.set(schedule.sheetId, list);
		}

		const sheetsSummary = [...allSheets]
			.sort((a, b) => b.id - a.id)
			.slice(0, 5)
			.map((sheet) => {
				const dates = scheduleBySheet.get(sheet.id) || [];
				const targetCount = allTargets.filter(
					(target) => target.sheetId === sheet.id,
				).length;
				const pointCount = allPoints.filter(
					(point) => point.sheetId === sheet.id,
				).length;
				const scheduleCount = (scheduleBySheet.get(sheet.id) || []).length;
				return {
					...sheet,
					dateRange: formatDateRange(dates),
					targetCount,
					pointCount,
					scheduleCount,
				};
			});

		const emailByDeviceId = new Map(
			allDeviceUsers.map((user) => [user.id, user.email]),
		);
		const pointById = new Map(allPoints.map((point) => [point.id, point]));
		const latestLogs = [...allLogs]
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 10);

		return (
			<div className="space-y-4">
				<div className="w-full max-md:text-center">
					<h1 className="text-2xl font-bold">Presensi</h1>
				</div>

				<div className="grid gap-4 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Log Terbaru</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Waktu</TableHead>
										<TableHead>Pengguna</TableHead>
										<TableHead>Titik</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{latestLogs.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={4}
												className="text-center text-muted-foreground"
											>
												Belum ada log presensi.
											</TableCell>
										</TableRow>
									) : (
										latestLogs.map((log) => (
											<TableRow key={log.id}>
												<TableCell>{formatTimestamp(log.timestamp)}</TableCell>
												<TableCell>
													{emailByDeviceId.get(log.deviceUserId) || "-"}
												</TableCell>
												<TableCell>
													{pointById.get(log.presencePointId)?.name || "-"}
												</TableCell>
												<TableCell>{log.status}</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	} catch (error: any) {
		return (
			<div className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-center mt-4">
				<h3 className="text-lg font-bold text-destructive mb-2">
					Database Error
				</h3>
				<p className="text-sm text-destructive/80 max-w-lg mx-auto">
					{error.message}
				</p>
			</div>
		);
	}
}
