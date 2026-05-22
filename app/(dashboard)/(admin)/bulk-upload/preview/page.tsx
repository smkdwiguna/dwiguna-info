"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface UserWithPassword {
	fullName: string;
	email: string;
	username: string;
	password: string;
	nisn?: string;
	nis?: string;
	nuptk?: string;
	tempatTanggalLahir?: string;
}

const PREVIEW_USERS_KEY = "bulk-upload-preview-users";

function parseUsersJson(raw: string): UserWithPassword[] {
	const parsed = JSON.parse(raw) as UserWithPassword[];
	if (!Array.isArray(parsed)) {
		throw new Error("Format data pengguna tidak valid.");
	}
	return parsed;
}

export default function PreviewPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);
	const [users, setUsers] = useState<UserWithPassword[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const usersJson = searchParams.get("users");

	useEffect(() => {
		const storedUsers =
			typeof window !== "undefined"
				? sessionStorage.getItem(PREVIEW_USERS_KEY)
				: null;
		const source = usersJson || storedUsers;

		if (!source) {
			setUsers([]);
			setLoadError("Data tidak ditemukan. Silahkan kembali dan proses ulang.");
			setIsLoading(false);
			return;
		}

		try {
			const parsed = parseUsersJson(source);
			setUsers(parsed);
			setLoadError(null);
			if (usersJson) {
				sessionStorage.setItem(PREVIEW_USERS_KEY, source);
			}
		} catch (error) {
			console.error(error);
			setUsers([]);
			setLoadError("Data pengguna tidak valid. Silahkan proses ulang.");
		} finally {
			setIsLoading(false);
		}
	}, [usersJson]);

	const downloadCSV = () => {
		const headers = [
			"Nama Lengkap",
			"Email",
			"Username",
			"Password",
			"NISN",
			"NIS",
			"NUPTK",
			"Tempat, Tanggal Lahir",
		];
		const rows = users.map((u) => [
			u.fullName,
			u.email,
			u.username,
			u.password,
			u.nisn || "",
			u.nis || "",
			u.nuptk || "",
			u.tempatTanggalLahir || "",
		]);

		const csv = [headers, ...rows]
			.map((row) => row.map((cell) => `"${cell}"`).join(","))
			.join("\n");

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `bulk-users-${new Date().toISOString().split("T")[0]}.csv`;
		link.click();
	};

	const createUsers = async () => {
		if (users.length === 0) {
			toast.error("Tidak ada pengguna untuk dibuat");
			return;
		}

		setIsCreating(true);
		try {
			const { createUsersWithPasswords } =
				await import("@/features/workspace-admin/actions/bulk-upload-actions");
			const response = await createUsersWithPasswords(users);

			if (response.success) {
				sessionStorage.removeItem(PREVIEW_USERS_KEY);
				toast.success(`Berhasil membuat ${response.created} pengguna!`);
				setTimeout(() => router.push("/bulk-upload"), 1000);
			} else {
				toast.error("Gagal membuat pengguna: " + response.error);
			}
		} catch (error) {
			console.error(error);
			toast.error("Terjadi kesalahan saat membuat pengguna.");
		} finally {
			setIsCreating(false);
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Button variant="outline" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Memuat data...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (loadError || users.length === 0) {
		return (
			<div className="space-y-4">
				<Button variant="outline" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">
							{loadError ||
								"Data tidak ditemukan. Silahkan kembali dan proses ulang."}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex gap-4 flex-wrap">
					<Button onClick={() => router.back()} variant="outline" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h1 className="text-2xl font-bold tracking-tight">
						Pratinjau {users.length} Pengguna Baru
					</h1>
				</div>
				<div className="flex gap-2 flex-wrap">
					<Button onClick={downloadCSV} variant="outline" size="sm">
						<Download className="h-4 w-4" /> Download CSV
					</Button>
					<Button onClick={createUsers} disabled={isCreating} size="sm">
						{isCreating ? "Membuat..." : "Buat Semua Pengguna"}
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto">
				<Table className="border">
					<TableHeader>
						<TableRow>
							<TableHead>Nama Lengkap</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Username</TableHead>
							<TableHead>Password</TableHead>
							<TableHead>NISN</TableHead>
							<TableHead>NIS</TableHead>
							<TableHead>NUPTK</TableHead>
							<TableHead>Tempat, Tanggal Lahir</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow key={user.email}>
								<TableCell className="font-medium">{user.fullName}</TableCell>
								<TableCell className="text-xs font-mono">
									{user.email}
								</TableCell>
								<TableCell className="text-xs font-mono">
									{user.username}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<span className="text-xs font-mono">{user.password}</span>
									</div>
								</TableCell>
								<TableCell className="text-sm">{user.nisn || "-"}</TableCell>
								<TableCell className="text-sm">{user.nis || "-"}</TableCell>
								<TableCell className="text-sm">{user.nuptk || "-"}</TableCell>
								<TableCell className="text-sm">
									{user.tempatTanggalLahir || "-"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
