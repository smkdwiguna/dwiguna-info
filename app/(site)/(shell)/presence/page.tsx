import { getDb } from "@/lib/db";
import {
	deviceUsers,
	presenceLogs,
	presencePoints,
	schedules,
} from "@/lib/db/schema";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	PageHeader,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";
import { SuspenseSpinner } from "@/components/suspense-spinner";
import { RouteRefreshPoller } from "@/components/route-refresh-poller";

export default function PresenceDashboardPage() {
	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<Suspense
					fallback={<SuspenseSpinner className="h-full w-full" size={96} />}
				>
					<PresenceDashboard />
				</Suspense>
			</PageShell>
		</>
	);
}

function formatTimestamp(value: number) {
	const normalized = value < 10_000_000_000 ? value * 1000 : value;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString("id-ID");
}

async function PresenceDashboard() {
	const db = await getDb();
	const [allSchedules, allPoints, allLogs, allDeviceUsers] = await Promise.all([
		db.select().from(schedules).all(),
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

	const emailByDeviceId = new Map(
		allDeviceUsers.map((user) => [user.id, user.email]),
	);
	const pointById = new Map(allPoints.map((point) => [point.id, point]));
	const latestLogs = [...allLogs]
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, 10);

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading className="w-full text-center sm:text-left">
					<PageHeaderTitle>Presensi</PageHeaderTitle>
				</PageHeaderHeading>
			</PageHeader>

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
		</PageShell>
	);
}
