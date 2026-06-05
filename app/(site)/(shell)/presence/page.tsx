import { getDb } from "@/lib/db";
import {
	attendanceSheets,
	deviceUsers,
	pointSchedules,
	presenceLogs,
	presencePoints,
	terminals,
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
import { requireSuperUserOrRedirect } from "@/features/access-management/actions/require-superuser";
import {
	minutesToTime,
	nowInJakarta,
	resolveWindow,
	type ResolvedWindow,
} from "@/lib/presence-schedule";

export default async function PresenceDashboardPage() {
	await requireSuperUserOrRedirect();
	return (
		<>
			<RouteRefreshPoller />
			<PageShell>
				<Suspense fallback={<SuspenseSpinner />}>
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
	const { dateKey: today, minutes: nowMinutes } = nowInJakarta();

	const [
		allPointSchedules,
		allPoints,
		allLogs,
		allDeviceUsers,
		allTerminals,
		allSheets,
	] = await Promise.all([
		db.select().from(pointSchedules),
		db.select().from(presencePoints),
		db.select().from(presenceLogs),
		db.select().from(deviceUsers),
		db.select().from(terminals),
		db.select().from(attendanceSheets),
	]);

	const pointById = new Map(allPoints.map((p) => [p.id, p]));
	const terminalById = new Map(allTerminals.map((t) => [t.id, t]));
	const sheetById = new Map(allSheets.map((s) => [s.id, s]));
	const emailByDeviceId = new Map(allDeviceUsers.map((u) => [u.id, u.email]));

	// Today's scheduled sessions
	const todaySchedules: {
		id: number;
		pointName: string;
		sheetName: string;
		terminalName: string;
		window: ResolvedWindow;
		isOpen: boolean;
		isPast: boolean;
	}[] = [];
	for (const s of allPointSchedules) {
		if (s.date !== today) continue;
		const point = pointById.get(s.presencePointId);
		if (!point) continue;
		const defaults: ResolvedWindow = {
			startTime: point.startTime,
			thresholdTime: point.thresholdTime,
			endTime: point.endTime,
		};
		const w = resolveWindow(s, defaults);
		const terminal = terminalById.get(s.terminalId);
		const sheet = sheetById.get(point.sheetId);
		todaySchedules.push({
			id: s.id,
			pointName: point.name,
			sheetName: sheet?.name ?? "-",
			terminalName: terminal?.name ?? s.terminalId,
			window: w,
			isOpen: nowMinutes >= w.startTime && nowMinutes < w.endTime,
			isPast: nowMinutes >= w.endTime,
		});
	}
	todaySchedules.sort((a, b) => a.window.startTime - b.window.startTime);

	// Today's logs
	const todayLogs = allLogs.filter((l) => l.date === today);
	const presentCount = todayLogs.filter((l) => l.status === "PRESENT").length;
	const lateCount = todayLogs.filter((l) => l.status === "LATE").length;

	// Recent logs (across all dates)
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

			{/* Summary cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Sesi Hari Ini
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{todaySchedules.length}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Tepat Waktu
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-green-600 dark:text-green-400">
							{presentCount}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Terlambat
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
							{lateCount}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				{/* Today's schedule */}
				<Card>
					<CardHeader>
						<CardTitle>Jadwal Hari Ini ({today})</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Titik</TableHead>
									<TableHead>Lembar</TableHead>
									<TableHead>Terminal</TableHead>
									<TableHead>Waktu</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{todaySchedules.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center text-muted-foreground"
										>
											Tidak ada sesi terjadwal hari ini.
										</TableCell>
									</TableRow>
								) : (
									todaySchedules.map((s) => (
										<TableRow key={s.id}>
											<TableCell className="font-medium">
												{s.pointName}
											</TableCell>
											<TableCell>{s.sheetName}</TableCell>
											<TableCell>{s.terminalName}</TableCell>
											<TableCell>
												{minutesToTime(s.window.startTime)} –{" "}
												{minutesToTime(s.window.endTime)}
											</TableCell>
											<TableCell>
												{s.isOpen ? (
													<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
														Buka
													</span>
												) : s.isPast ? (
													<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
														Selesai
													</span>
												) : (
													<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
														Belum Buka
													</span>
												)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Recent logs */}
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
											<TableCell>
												{log.status === "PRESENT" ? (
													<span className="text-green-600 dark:text-green-400">
														{log.status}
													</span>
												) : log.status === "LATE" ? (
													<span className="text-amber-600 dark:text-amber-400">
														{log.status}
													</span>
												) : (
													log.status
												)}
											</TableCell>
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
