"use client";

import { useState, useEffect } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ChevronLeft,
	ChevronRight,
	Edit,
	Info,
	KeyRound,
	Search,
	ImagePlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { normalizeAccessList } from "@/lib/access";
import { ButtonGroup } from "@/components/ui/button-group";

interface WorkspaceUserName {
	fullName?: string | null;
}

interface WorkspaceUser {
	id?: string | null;
	primaryEmail?: string | null;
	name?: WorkspaceUserName;
	orgUnitPath?: string | null;
	suspended?: boolean | null;
	thumbnailPhotoUrl?: string | null;
	customSchemas?: Record<string, unknown> | null;
	lastLoginTime?: string | null;
	creationTime?: string | null;
}

export function UsersTableClient({ users }: { users: WorkspaceUser[] }) {
	const [localUsers, setLocalUsers] = useState(users);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterUnit, setFilterUnit] = useState("all");
	const [editUser, setEditUser] = useState<WorkspaceUser | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [infoUser, setInfoUser] = useState<WorkspaceUser | null>(null);
	const [isInfoOpen, setIsInfoOpen] = useState(false);
	const [isInfoLoading, setIsInfoLoading] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [resetPassword, setResetPassword] = useState<string | null>(null);
	const [editCustomFields, setEditCustomFields] = useState({
		nisn: "",
		nis: "",
		nuptk: "",
		tempatTanggalLahir: "",
	});

	// Single Photo Upload state
	const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);
	const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);

	const rowsPerPage = 10;

	useEffect(() => {
		setLocalUsers(users);
	}, [users]);

	const collectCustomSchemaValues = (user: WorkspaceUser) => {
		const values: string[] = [];
		const pushValue = (value: unknown) => {
			if (typeof value === "string" && value.trim()) {
				values.push(value);
			}
		};
		const extractFields = (schema: Record<string, unknown>) => {
			pushValue(schema.nisn);
			pushValue(schema.nis);
			pushValue(schema.nuptk);
			pushValue(schema.tempatTanggalLahir);
			pushValue(schema.access);
			pushValue(schema.permissions);
		};

		const customSchemas = user?.customSchemas;
		if (customSchemas && typeof customSchemas === "object") {
			extractFields(customSchemas as Record<string, unknown>);
			for (const schema of Object.values(customSchemas)) {
				if (schema && typeof schema === "object") {
					extractFields(schema as Record<string, unknown>);
				}
			}
		}
		return values;
	};

	const isSchemaRecord = (value: unknown): value is Record<string, unknown> => {
		return !!value && typeof value === "object";
	};

	const getCustomFieldValue = (
		customSchemas: Record<string, unknown> | null | undefined,
		field: string,
	) => {
		if (!customSchemas || typeof customSchemas !== "object") return "";
		for (const schema of Object.values(customSchemas)) {
			if (!schema || typeof schema !== "object") continue;
			const record = schema as Record<string, unknown>;
			if (typeof record[field] === "string") {
				return record[field] as string;
			}
		}
		return "";
	};

	const formatDateTime = (value?: string | null) => {
		if (!value) return "-";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleString("id-ID");
	};

	const units = Array.from(
		new Set(localUsers.map((u) => u.orgUnitPath).filter(Boolean)),
	) as string[];

	const normalizedSearch = searchTerm.trim().toLowerCase();

	const filtered = localUsers.filter((u) => {
		const matchesSearch =
			normalizedSearch.length === 0 ||
			[u.name?.fullName, u.primaryEmail, ...collectCustomSchemaValues(u)].some(
				(value) =>
					(value ?? "").toString().toLowerCase().includes(normalizedSearch),
			);
		const matchesUnit =
			!filterUnit || filterUnit === "all"
				? true
				: (u.orgUnitPath?.includes(filterUnit) ?? false);
		return matchesSearch && matchesUnit;
	});

	const totalPages = Math.ceil(filtered.length / rowsPerPage);
	const startIndex = (currentPage - 1) * rowsPerPage;
	const currentUsers = filtered.slice(startIndex, startIndex + rowsPerPage);

	const openEdit = (user: WorkspaceUser) => {
		// Create a deep copy so we can cleanly handle changes and fallback
		setEditUser(JSON.parse(JSON.stringify(user)));
		setEditCustomFields({
			nisn: getCustomFieldValue(user.customSchemas, "nisn"),
			nis: getCustomFieldValue(user.customSchemas, "nis"),
			nuptk: getCustomFieldValue(user.customSchemas, "nuptk"),
			tempatTanggalLahir: getCustomFieldValue(
				user.customSchemas,
				"tempatTanggalLahir",
			),
		});
		setNewPhotoBase64(null);
		setNewPhotoPreview(null);
		setIsDialogOpen(true);
	};

	const openInfo = async (user: WorkspaceUser) => {
		setInfoUser(user);
		setResetPassword(null);
		setIsInfoOpen(true);
		setIsInfoLoading(true);
		try {
			const { getUserDetails } = await import("../actions/get-user-details");
			if (!user.primaryEmail) {
				throw new Error("Pengguna tidak memiliki email utama");
			}
			const detail = await getUserDetails(user.primaryEmail);
			setInfoUser(detail);
		} catch (error) {
			console.error("Failed to load user info", error);
			toast.error("Gagal memuat informasi pengguna.");
		} finally {
			setIsInfoLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (!infoUser?.primaryEmail) return;
		setIsResetting(true);
		try {
			const { resetUserPassword } =
				await import("../actions/reset-user-password");
			const result = await resetUserPassword(infoUser.primaryEmail);
			setResetPassword(result.password);
			toast.success("Password berhasil direset.");
		} catch (error) {
			console.error("Failed to reset password", error);
			toast.error("Gagal mereset password.");
		} finally {
			setIsResetting(false);
		}
	};

	const processImageToSquareBase64 = (
		file: File | Blob,
	): Promise<{ base64: string; preview: string }> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement("canvas");
					const size = Math.min(img.width, img.height);
					const startX = (img.width - size) / 2;
					const startY = (img.height - size) / 2;

					canvas.width = 256;
					canvas.height = 256;
					const ctx = canvas.getContext("2d");
					if (ctx) {
						// Center crop and resize
						ctx.drawImage(img, startX, startY, size, size, 0, 0, 256, 256);
						const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
						// Google wants web-safe base64: replace + with - and / with _
						const base64 = dataUrl
							.split(",")[1]
							.replace(/\+/g, "-")
							.replace(/\//g, "_");
						resolve({ base64, preview: dataUrl });
					} else {
						reject(new Error("Could not get canvas context"));
					}
				};
				img.onerror = () => reject(new Error("Failed to load image"));
				img.src = event.target?.result as string;
			};
			reader.onerror = () => reject(new Error("Failed to read file"));
			reader.readAsDataURL(file);
		});
	};

	const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const { base64, preview } = await processImageToSquareBase64(file);
			setNewPhotoBase64(base64);
			setNewPhotoPreview(preview);
			toast.success("Gambar berhasil diproses.");
		} catch (error) {
			console.error("Failed to process image", error);
			toast.error("Gagal memproses gambar.");
		}
	};

	const handleSave = async () => {
		if (!editUser || !editUser.primaryEmail) return;
		setIsSaving(true);
		try {
			const { updateUser } = await import("../actions/update-user");

			// Extract names correctly for Google Admin API
			const fullName = editUser.name?.fullName || "";
			const parts = fullName.split(" ");
			const givenName = parts[0] || "-";
			const familyName = parts.slice(1).join(" ") || "-";

			const payload = {
				name: {
					givenName,
					familyName,
					fullName,
				},
				orgUnitPath: editUser.orgUnitPath,
				customFields: {
					nisn: editCustomFields.nisn,
					nis: editCustomFields.nis,
					nuptk: editCustomFields.nuptk,
					tempatTanggalLahir: editCustomFields.tempatTanggalLahir,
				},
			};

			const updatedUser = await updateUser(editUser.primaryEmail, payload);

			// If new photo was selected, upload it
			let finalPhotoUrl = editUser.thumbnailPhotoUrl;
			if (newPhotoBase64) {
				const { updateUserPhoto } =
					await import("../actions/update-user-photo");
				await updateUserPhoto(editUser.primaryEmail, newPhotoBase64);
				finalPhotoUrl = newPhotoPreview;
			}

			// Update local state immediately without reloading the page
			setLocalUsers((prev) =>
				prev.map((u) =>
					u.primaryEmail === editUser.primaryEmail
						? {
								...u,
								name: { ...u.name, ...payload.name },
								orgUnitPath: payload.orgUnitPath,
								thumbnailPhotoUrl: finalPhotoUrl,
								customSchemas: updatedUser?.customSchemas ?? u.customSchemas,
							}
						: u,
				),
			);
			setIsDialogOpen(false);
		} catch (error) {
			console.error("Failed to update user", error);
			toast.error("Gagal memperbarui pengguna.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!editUser || !editUser.primaryEmail) return;

		setIsDeleting(true);
		try {
			const { deleteUser } = await import("../actions/delete-user");
			await deleteUser(editUser.primaryEmail);

			// Remove from local state immediately
			setLocalUsers((prev) =>
				prev.filter((u) => u.primaryEmail !== editUser.primaryEmail),
			);
			setIsDialogOpen(false);
			toast.success("Pengguna berhasil dihapus.");
		} catch (error) {
			console.error("Failed to delete user", error);
			toast.error("Gagal menghapus pengguna.");
		} finally {
			setIsDeleting(false);
		}
	};

	const promptDelete = () => {
		if (!editUser) return;

		// Tutup dialog terlebih dahulu agar toast tidak terhalang (pointer-events/focus)
		setIsDialogOpen(false);

		toast(`Hapus ${editUser.name?.fullName}?`, {
			description: "Tindakan ini tidak dapat dibatalkan.",
			action: {
				label: "Hapus",
				onClick: handleDelete,
			},
			duration: Infinity,
			cancel: {
				label: "Batal",
				onClick: () => {},
			},
		});
	};

	const customSchemaValues =
		infoUser?.customSchemas && typeof infoUser.customSchemas === "object"
			? Object.values(infoUser.customSchemas)
			: [];
	const akademik =
		(customSchemaValues.find(
			(schema) =>
				isSchemaRecord(schema) &&
				("nisn" in schema ||
					"nis" in schema ||
					"nuptk" in schema ||
					"tempatTanggalLahir" in schema),
		) as Record<string, string>) || ({} as Record<string, string>);
	const accessValues = infoUser?.customSchemas
		? normalizeAccessList(
				Object.values(infoUser.customSchemas as Record<string, unknown>)
					.flatMap((schema) => {
						if (!schema || typeof schema !== "object") return [];
						const fields = schema as Record<string, unknown>;
						return [fields.access, fields.permissions]
							.filter((value): value is string => typeof value === "string")
							.filter(Boolean);
					})
					.join(","),
			)
		: [];

	return (
		<div>
			<Dialog
				open={isInfoOpen}
				onOpenChange={(open) => {
					setIsInfoOpen(open);
					if (!open) {
						setTimeout(() => {
							setInfoUser(null);
							setIsInfoLoading(false);
							setIsResetting(false);
							setResetPassword(null);
						}, 500);
					}
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Info Pengguna</DialogTitle>
					</DialogHeader>
					{isInfoLoading ? (
						<div className="py-4 text-sm text-muted-foreground">
							Memuat data...
						</div>
					) : infoUser ? (
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label>Nama Lengkap</Label>
								<Input value={infoUser.name?.fullName || "-"} readOnly />
							</div>
							<div className="space-y-2">
								<Label>Email</Label>
								<Input value={infoUser.primaryEmail || "-"} readOnly />
							</div>
							<div className="space-y-2">
								<Label>ID</Label>
								<Input value={infoUser.id || "-"} readOnly />
							</div>
							<div className="space-y-2">
								<Label>Unit Organisasi</Label>
								<Input value={infoUser.orgUnitPath || "/"} readOnly />
							</div>
							<div className="space-y-2">
								<Label>Terakhir Login</Label>
								<Input
									value={formatDateTime(infoUser.lastLoginTime)}
									readOnly
								/>
							</div>
							<div className="space-y-2">
								<Label>Dibuat</Label>
								<Input value={formatDateTime(infoUser.creationTime)} readOnly />
							</div>
							{akademik.nisn && (
								<div className="space-y-2">
									<Label>NISN</Label>
									<Input value={akademik.nisn || "-"} readOnly />
								</div>
							)}
							{akademik.nis && (
								<div className="space-y-2">
									<Label>NIS</Label>
									<Input value={akademik.nis || "-"} readOnly />
								</div>
							)}
							{akademik.nuptk && (
								<div className="space-y-2">
									<Label>NUPTK</Label>
									<Input value={akademik.nuptk || "-"} readOnly />
								</div>
							)}
							{akademik.tempatTanggalLahir && (
								<div className="space-y-2">
									<Label>Tempat, Tanggal Lahir</Label>
									<Input value={akademik.tempatTanggalLahir || "-"} readOnly />
								</div>
							)}
							{accessValues.length > 0 && (
								<div className="space-y-2">
									<Label>Akses</Label>
									<Input value={accessValues.join(", ")} readOnly />
								</div>
							)}
							{resetPassword && (
								<div className="space-y-2">
									<Label>Password Baru</Label>
									<Input value={resetPassword} readOnly />
									<p className="text-xs text-muted-foreground">
										Pengguna diminta ganti password saat login berikutnya.
									</p>
								</div>
							)}
						</div>
					) : (
						<div className="py-4 text-sm text-muted-foreground">
							Data pengguna tidak tersedia.
						</div>
					)}
					<DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
						<Button
							variant="outline"
							onClick={() => setIsInfoOpen(false)}
							disabled={isResetting}
						>
							Tutup
						</Button>
						<Button
							onClick={handleResetPassword}
							disabled={isResetting || isInfoLoading || !infoUser?.primaryEmail}
						>
							<KeyRound className="h-4 w-4" />
							{isResetting ? "Mereset..." : "Reset Password"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Pengguna</DialogTitle>
					</DialogHeader>
					{editUser && (
						<div className="space-y-4 py-4">
							<div className="flex flex-col items-center gap-4 mb-4">
								<Avatar className="size-24">
									<AvatarImage
										referrerPolicy="no-referrer"
										src={
											newPhotoPreview || editUser.thumbnailPhotoUrl || undefined
										}
										alt={editUser.name?.fullName || ""}
									/>
									<AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold not-italic">
										{editUser.name?.fullName?.charAt(0).toUpperCase() || "?"}
									</AvatarFallback>
								</Avatar>
								<div className="flex items-center justify-center w-full">
									<Label
										htmlFor="photo-upload"
										className="flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors"
									>
										<ImagePlus className="w-4 h-4" />
										Ubah Foto
									</Label>
									<Input
										id="photo-upload"
										type="file"
										accept="image/*"
										className="hidden"
										onChange={handleImageSelect}
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="fullName">Nama Lengkap</Label>
								<Input
									id="fullName"
									value={editUser.name?.fullName || ""}
									onChange={(e) =>
										setEditUser({
											...editUser,
											name: { ...editUser.name, fullName: e.target.value },
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									value={editUser.primaryEmail || ""}
									disabled
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="orgUnitPath">Unit Organisasi</Label>
								<Input
									id="orgUnitPath"
									value={editUser.orgUnitPath || ""}
									onChange={(e) =>
										setEditUser({
											...editUser,
											orgUnitPath: e.target.value,
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="nisn">NISN</Label>
								<Input
									id="nisn"
									value={editCustomFields.nisn}
									onChange={(e) =>
										setEditCustomFields((prev) => ({
											...prev,
											nisn: e.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="nis">NIS</Label>
								<Input
									id="nis"
									value={editCustomFields.nis}
									onChange={(e) =>
										setEditCustomFields((prev) => ({
											...prev,
											nis: e.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="nuptk">NUPTK</Label>
								<Input
									id="nuptk"
									value={editCustomFields.nuptk}
									onChange={(e) =>
										setEditCustomFields((prev) => ({
											...prev,
											nuptk: e.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="tempatTanggalLahir">
									Tempat, Tanggal Lahir
								</Label>
								<Input
									id="tempatTanggalLahir"
									value={editCustomFields.tempatTanggalLahir}
									onChange={(e) =>
										setEditCustomFields((prev) => ({
											...prev,
											tempatTanggalLahir: e.target.value,
										}))
									}
								/>
							</div>
						</div>
					)}
					<DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
						<Button
							variant="destructive"
							size="sm"
							onClick={promptDelete}
							disabled={isDeleting || isSaving}
						>
							{isDeleting ? "Menghapus..." : "Hapus Pengguna"}
						</Button>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setIsDialogOpen(false)}
								disabled={isSaving || isDeleting}
							>
								Batal
							</Button>
							<Button onClick={handleSave} disabled={isSaving || isDeleting}>
								{isSaving ? "Menyimpan..." : "Simpan"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="flex flex-col sm:flex-row items-center justify-center gap-4 m-4">
				<div className="relative w-full">
					<Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Cari nama/nomor/email pengguna..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setCurrentPage(0);
						}}
						className="pl-9 w-full"
					/>
				</div>
				<Select value={filterUnit} onValueChange={setFilterUnit}>
					<SelectTrigger className="w-full md:w-48">
						<SelectValue placeholder="Pilih Unit" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Semua Unit</SelectItem>
						{units.sort().map((u) => (
							<SelectItem key={u} value={u}>
								{u === "/" ? "Root (/)" : u}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12.5"></TableHead>
						<TableHead>Nama Lengkap</TableHead>
						<TableHead>Alamat Email</TableHead>
						<TableHead>Unit Organisasi</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentUsers.map((user) => (
						<TableRow
							key={user.id || user.primaryEmail}
							className={user.suspended ? "font-light italic opacity-50" : ""}
						>
							<TableCell>
								<Avatar className="size-8 ml-1.5">
									<AvatarImage
										referrerPolicy="no-referrer"
										src={user.thumbnailPhotoUrl ?? undefined}
										alt={user.name?.fullName || ""}
									/>
									<AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold not-italic">
										{user.name?.fullName?.charAt(0).toUpperCase() || "?"}
									</AvatarFallback>
								</Avatar>
							</TableCell>
							<TableCell className="font-medium">
								{user.name?.fullName || "-"}
							</TableCell>
							<TableCell>{user.primaryEmail}</TableCell>
							<TableCell>{user.orgUnitPath || "/"}</TableCell>
							<TableCell className="flex justify-end">
								<ButtonGroup>
									<Button
										size="icon"
										variant="outline"
										aria-label="Info"
										onClick={() => openInfo(user)}
									>
										<Info />
									</Button>
									<Button
										size="icon"
										variant="outline"
										aria-label="Edit"
										onClick={() => openEdit(user)}
									>
										<Edit />
									</Button>
								</ButtonGroup>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div className="flex items-center justify-between px-4 py-4 border-t">
				<div className="text-sm text-muted-foreground">
					Menampilkan {startIndex + 1} -{" "}
					{Math.min(startIndex + rowsPerPage, filtered.length)} dari{" "}
					{filtered.length} pengguna
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={currentPage === 1}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
