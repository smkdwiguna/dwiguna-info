"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CircleMinus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { normalizeAccessList, SUPERUSER_EMAIL } from "@/lib/access";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";

interface WorkspaceUser {
	id?: string;
	primaryEmail?: string;
	fullName?: string | null;
	orgUnitPath?: string | null;
	suspended?: boolean;
	thumbnailPhotoUrl?: string | null;
	customSchemas?: Record<string, unknown> | null;
}

const FEATURE_SETS = [
	{
		key: "users",
		title: "Pengguna",
		permissions: [{ key: "users", label: "Kelola Pengguna" }],
	},
	{
		key: "shortlink",
		title: "Tautan",
		permissions: [{ key: "shortlink", label: "Kelola Tautan" }],
	},
	{
		key: "presence",
		title: "Presensi",
		permissions: [
			{ key: "presence.view", label: "Lihat Presensi" },
			{ key: "presence.edit.sheets", label: "Edit Lembar" },
			{ key: "presence.edit.attendances", label: "Edit Kehadiran" },
		],
	},
	{
		key: "inventory",
		title: "Inventaris",
		permissions: [{ key: "inventory", label: "Kelola Inventaris" }],
	},
];

function extractAccessFromCustomSchemas(
	customSchemas: Record<string, unknown> | null | undefined,
) {
	if (!customSchemas) return "";
	const values: string[] = [];
	for (const schema of Object.values(
		customSchemas as Record<string, unknown>,
	)) {
		if (!schema) continue;
		if (typeof schema === "string") {
			values.push(schema);
			continue;
		}
		if (Array.isArray(schema)) {
			values.push(...schema.filter((s) => typeof s === "string"));
			continue;
		}
		if (typeof schema === "object") {
			const s = schema as Record<string, unknown>;
			if (typeof s.access === "string") values.push(s.access);
			if (typeof s.permissions === "string") values.push(s.permissions);
			if (typeof s.permission === "string") values.push(s.permission);
			if (typeof s.value === "string") values.push(s.value);
		}
	}
	return values.join(",");
}

export function AccessManagementClient({ users }: { users: WorkspaceUser[] }) {
	const [selectedPermission, setSelectedPermission] = useState<{
		key: string;
		label: string;
	} | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
	const [localUsers, setLocalUsers] = useState(users);

	useEffect(() => {
		setLocalUsers(users);
	}, [users]);

	const accessMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const u of localUsers) {
			map[u.primaryEmail || ""] = extractAccessFromCustomSchemas(
				u.customSchemas,
			);
		}
		return map;
	}, [localUsers]);

	const usersWithPermission = (permission: string) =>
		localUsers.filter((u) =>
			normalizeAccessList(accessMap[u.primaryEmail || ""] || "").includes(
				permission,
			),
		);

	const openAddDialog = (permission: { key: string; label: string }) => {
		setSelectedPermission(permission);
		setSearchTerm("");
		setSelectedEmails([]);
		setIsDialogOpen(true);
	};

	const updateLocalUser = (email: string, updated: WorkspaceUser) => {
		setLocalUsers((prev) =>
			prev.map((u) =>
				u.primaryEmail === email
					? {
							...u,
							customSchemas: updated.customSchemas || u.customSchemas,
							thumbnailPhotoUrl:
								updated.thumbnailPhotoUrl || u.thumbnailPhotoUrl,
						}
					: u,
			),
		);
	};

	const toggleCandidate = (email: string) => {
		setSelectedEmails((prev) =>
			prev.includes(email)
				? prev.filter((item) => item !== email)
				: [...prev, email],
		);
	};

	const handleBulkGrant = async () => {
		if (!selectedPermission) return;
		if (selectedEmails.length === 0) return;
		setIsSaving(true);
		try {
			const { updateUserAccess } =
				await import("@/features/access-management/actions/update-user-access");
			const tasks = selectedEmails
				.filter((email) => email && email.toLowerCase() !== SUPERUSER_EMAIL)
				.map((email) => {
					const before = normalizeAccessList(accessMap[email] || "");
					if (before.includes(selectedPermission.key)) {
						return Promise.resolve({ email, skipped: true });
					}
					const newAccess = Array.from(
						new Set([...before, selectedPermission.key]),
					).join(",");
					return updateUserAccess(email, newAccess)
						.then((res) => ({ email, res }))
						.catch((error) => ({ email, error }));
				});

			const results = await Promise.all(tasks);
			let anyError = false;
			let updatedCount = 0;
			for (const result of results) {
				if ("error" in result) {
					anyError = true;
					console.error("Failed to grant access", result.email, result.error);
					continue;
				}
				if ("skipped" in result) continue;
				updatedCount++;
				updateLocalUser(result.email, result.res);
			}

			if (updatedCount > 0) {
				toast.success("Izin diberikan.");
			} else {
				toast("Tidak ada perubahan.");
			}
			if (anyError) {
				toast.error("Sebagian pemberian izin gagal. Periksa log.");
			}
			setSelectedEmails([]);
		} catch (error) {
			console.error("Failed to grant permissions", error);
			toast.error("Gagal memberikan izin.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleRemovePermission = async (email: string, permission: string) => {
		if (email.toLowerCase() === SUPERUSER_EMAIL) return;
		setIsSaving(true);
		try {
			const { updateUserAccess } =
				await import("@/features/access-management/actions/update-user-access");
			const before = normalizeAccessList(accessMap[email] || "");
			const newAccess = before.filter((p) => p !== permission).join(",");
			const updated = await updateUserAccess(email, newAccess);
			updateLocalUser(email, updated);
			toast.success("Izin dihapus.");
		} catch (error) {
			console.error("Failed to remove permission", error);
			toast.error("Gagal menghapus izin.");
		} finally {
			setIsSaving(false);
		}
	};

	const filteredCandidates = useMemo(() => {
		if (!selectedPermission) return [];
		const term = searchTerm.trim().toLowerCase();
		return localUsers.filter((u) => {
			const email = u.primaryEmail || "";
			if (!email) return false;
			if (email.toLowerCase() === SUPERUSER_EMAIL) return false;
			const hasPermission = normalizeAccessList(
				accessMap[email] || "",
			).includes(selectedPermission.key);
			if (hasPermission) return false;
			if (!term) return true;
			const name = u.fullName?.toLowerCase() || "";
			return name.includes(term) || email.toLowerCase().includes(term);
		});
	}, [accessMap, localUsers, searchTerm, selectedPermission]);

	return (
		<div className="space-y-16">
			{FEATURE_SETS.map((feature) => (
				<article key={feature.key} className="space-y-2">
					<h2 className="font-bold text-xl">{feature.title}</h2>
					{feature.permissions.map((perm) => {
						const list = usersWithPermission(perm.key);
						return (
							<div
								key={perm.key}
								className="rounded-lg overflow-hidden border bg-muted/30"
							>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b px-4 py-3">
									<div>
										<div className="text-sm font-medium">{perm.label}</div>
										<div className="text-xs text-muted-foreground">
											{perm.key}
										</div>
									</div>
									<Button
										size="sm"
										onClick={() => openAddDialog(perm)}
										disabled={isSaving}
									>
										<Plus className="h-4 w-4" />
										Berikan Izin
									</Button>
								</div>
								<Table>
									<TableBody>
										{list.length === 0 ? (
											<TableRow className="bg-background">
												<TableCell colSpan={3} className="text-center">
													Belum ada pengguna.
												</TableCell>
											</TableRow>
										) : (
											list.map((u) => {
												const disabled = isSaving;
												return (
													<TableRow
														key={u.primaryEmail}
														className="bg-background"
													>
														<TableCell className="font-bold pl-4">
															{u.fullName || "-"}
														</TableCell>
														<TableCell>{u.primaryEmail}</TableCell>
														<TableCell>{u.orgUnitPath || "-"}</TableCell>
														<TableCell className="text-right">
															<Button
																variant="destructive"
																size="icon"
																aria-label="Hapus izin"
																disabled={disabled}
																onClick={() =>
																	handleRemovePermission(
																		u.primaryEmail!,
																		perm.key,
																	)
																}
															>
																<CircleMinus className="h-4 w-4" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</div>
						);
					})}
				</article>
			))}

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Berikan Izin: {selectedPermission?.label}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<InputGroup>
							<InputGroupAddon>
								<Search />
							</InputGroupAddon>
							<InputGroupInput
								placeholder="Cari nama atau email..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</InputGroup>
						<div className="space-y-2 max-h-80 overflow-y-auto">
							{filteredCandidates.length === 0 ? (
								<div className="p-4 text-sm text-muted-foreground text-center">
									Tidak ada pengguna yang bisa ditambahkan.
								</div>
							) : (
								filteredCandidates.map((u) => (
									<FieldLabel key={u.primaryEmail}>
										<Field orientation="horizontal">
											<Checkbox
												checked={selectedEmails.includes(u.primaryEmail || "")}
												onCheckedChange={() =>
													toggleCandidate(u.primaryEmail || "")
												}
											/>
											<FieldContent>
												<FieldTitle>{u.fullName}</FieldTitle>
												<FieldDescription>{u.primaryEmail}</FieldDescription>
											</FieldContent>
										</Field>
									</FieldLabel>
								))
							)}
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isSaving}>
								Tutup
							</Button>
						</DialogClose>
						<Button
							onClick={handleBulkGrant}
							disabled={isSaving || selectedEmails.length === 0}
						>
							<Plus className="h-4 w-4" />
							Berikan Izin
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
