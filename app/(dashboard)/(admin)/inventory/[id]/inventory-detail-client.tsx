"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	Search,
	Trash2,
	Edit,
	UserPlus,
	UserMinus,
	ArrowUpRight,
	ArrowDownLeft,
	Settings2,
	History,
	Users,
	Boxes,
	ArrowLeftRight,
	ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import {
	addInventoryItem,
	updateInventoryItem,
	deleteInventoryItem,
	createStockTransaction,
	transferInventoryItem,
	addInventoryMember,
	removeInventoryMember,
	updateInventoryMemberRole,
	updateInventoryName,
	deleteInventory,
} from "@/features/inventory/actions/inventory";
import {
	PageHeader,
	PageHeaderBack,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/components/ui/page-header";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { ButtonGroup } from "@/components/ui/button-group";

interface InventoryInfo {
	id: number;
	name: string;
	createdAt: string;
}

interface InventoryOption {
	id: number;
	name: string;
}

interface WorkspaceUserRecord {
	id?: string;
	primaryEmail?: string;
	name?: { fullName?: string };
	thumbnailPhotoUrl?: string | null;
	suspended?: boolean;
}

interface ItemRecord {
	id: number;
	name: string;
	sku: string | null;
	description: string | null;
	quantity: number;
	unit: string;
	location: string | null;
	createdAt: string;
	updatedAt: string;
}

interface MemberRecord {
	id: number;
	email: string;
	role: string;
}

interface TransactionRecord {
	id: number;
	itemId: number;
	type: string; // IN, OUT, ADJUST
	quantity: number;
	notes: string | null;
	createdByEmail: string;
	createdAt: string;
}

interface FileRecord {
	id: number;
	inventoryId: number;
	driveFileId: string;
	name: string;
	webViewLink: string | null;
	thumbnailLink: string | null;
	uploadedByEmail: string;
	createdAt: string;
}

interface AttachmentRecord {
	id: number;
	itemId: number;
	fileId: number;
}

interface InventoryDetailClientProps {
	initialData: {
		inventory: InventoryInfo;
		userRole: string;
		userEmail: string;
		items: ItemRecord[];
		members: MemberRecord[];
		transactions: TransactionRecord[];
		files: FileRecord[];
		attachments: AttachmentRecord[];
	};
	workspaceUsers: WorkspaceUserRecord[];
}

export function InventoryDetailClient({
	initialData,
	workspaceUsers,
}: InventoryDetailClientProps) {
	const router = useRouter();
	const [inventory] = useState<InventoryInfo>(initialData.inventory);
	const [inventoryName, setInventoryName] = useState(
		initialData.inventory.name,
	);
	const [userRole] = useState<string>(initialData.userRole);
	const [userEmail] = useState<string>(initialData.userEmail);

	// Lists
	const [items, setItems] = useState<ItemRecord[]>(initialData.items);
	const [members, setMembers] = useState<MemberRecord[]>(initialData.members);
	const [transactions, setTransactions] = useState<TransactionRecord[]>(
		initialData.transactions,
	);
	const [transferInventories, setTransferInventories] = useState<
		InventoryOption[]
	>([]);
	const [selectedMemberEmails, setSelectedMemberEmails] = useState<string[]>(
		[],
	);

	// Search and filter
	const [itemSearch, setItemSearch] = useState("");

	// Pending transitions
	const [isPending, startTransition] = useTransition();

	// MODALS STATE
	// Item Modals
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isTxOpen, setIsTxOpen] = useState(false);
	const [isTransferOpen, setIsTransferOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isDeleteInventoryOpen, setIsDeleteInventoryOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(null);

	// Member Modals
	const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
	const [isDeleteMemberOpen, setIsDeleteMemberOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(
		null,
	);

	// FORMS STATE
	// Add/Edit Item Form
	const [itemName, setItemName] = useState("");
	const [itemSku, setItemSku] = useState("");
	const [itemDesc, setItemDesc] = useState("");
	const [itemQty, setItemQty] = useState(1);
	const [itemUnit, setItemUnit] = useState("pcs");
	const [itemLocation, setItemLocation] = useState("");

	// Stock transaction Form
	const [txType, setTxType] = useState<"IN" | "OUT">("IN");
	const [txQty, setTxQty] = useState(1);
	const [txNotes, setTxNotes] = useState("");

	// Transfer form state
	const [transferQty, setTransferQty] = useState(1);
	const [transferTargetInventoryId, setTransferTargetInventoryId] =
		useState("");

	// Member Access Form
	const [memberPickerSearch, setMemberPickerSearch] = useState("");

	// PERMISSION BOOLEANS
	const canEdit =
		userRole === "OWNER" || userRole === "EDITOR" || userRole === "ADMIN";
	const canManageInventory = userRole === "OWNER" || userRole === "ADMIN";
	const canManageMembers = userRole === "OWNER" || userRole === "ADMIN";
	const canDeleteInventory = userRole === "OWNER" || userRole === "ADMIN";
	const isInventoryNameDirty =
		inventoryName.trim() !== inventory.name && inventoryName.trim().length > 0;

	const workspaceUserMap = React.useMemo(() => {
		return new Map(
			workspaceUsers
				.filter((user) => user.primaryEmail)
				.map((user) => [user.primaryEmail!.toLowerCase(), user]),
		);
	}, [workspaceUsers]);

	const existingMemberEmails = React.useMemo(
		() => new Set(members.map((member) => member.email.toLowerCase())),
		[members],
	);

	const candidateUsers = React.useMemo(() => {
		const term = memberPickerSearch.toLowerCase().trim();
		return workspaceUsers.filter((user) => {
			const email = user.primaryEmail?.toLowerCase() || "";
			if (!email) return false;
			if (existingMemberEmails.has(email)) return false;
			if (user.suspended) return false;
			if (!term) return true;
			const fullName = user.name?.fullName?.toLowerCase() || "";
			return fullName.includes(term) || email.includes(term);
		});
	}, [existingMemberEmails, memberPickerSearch, workspaceUsers]);

	// Filtered lists
	const filteredItems = items.filter((item) => {
		const term = itemSearch.toLowerCase().trim();
		if (!term) return true;
		return (
			item.name.toLowerCase().includes(term) ||
			(item.sku && item.sku.toLowerCase().includes(term)) ||
			(item.location && item.location.toLowerCase().includes(term))
		);
	});

	// Items map for transaction history rendering
	const itemsMap = React.useMemo(() => {
		return new Map(items.map((item) => [item.id, item]));
	}, [items]);

	// ITEM ACTIONS LOGIC

	const openEditModal = (item: ItemRecord) => {
		setSelectedItem(item);
		setItemName(item.name);
		setItemSku(item.sku || "");
		setItemDesc(item.description || "");
		setItemUnit(item.unit);
		setItemLocation(item.location || "");
		setIsEditOpen(true);
	};

	const openTxModal = (item: ItemRecord) => {
		setSelectedItem(item);
		setTxType("IN");
		setTxQty(1);
		setTxNotes("");
		setIsTxOpen(true);
	};

	const openTransferModal = async (item: ItemRecord) => {
		setSelectedItem(item);
		setTransferQty(1);
		setTransferTargetInventoryId("");
		setIsTransferOpen(true);

		if (transferInventories.length > 0) return;

		try {
			const { getInventories } =
				await import("@/features/inventory/actions/inventory");
			const available = await getInventories();
			setTransferInventories(
				available
					.filter((inv) => inv.id !== inventory.id)
					.map((inv) => ({
						id: inv.id,
						name: inv.name,
					})),
			);
		} catch (error) {
			console.error("Gagal memuat daftar inventaris tujuan:", error);
			toast.error("Gagal memuat daftar inventaris tujuan.");
		}
	};

	const handleSaveInventoryName = () => {
		if (!canManageInventory) return;
		if (!isInventoryNameDirty) return;

		startTransition(async () => {
			try {
				const updated = await updateInventoryName(inventory.id, inventoryName);
				setInventoryName(updated.name);
				toast.success("Nama inventaris berhasil diperbarui.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error
						? error.message
						: "Gagal memperbarui nama inventaris.";
				toast.error(message);
			}
		});
	};

	const handleDeleteInventory = () => {
		if (!canDeleteInventory) return;

		startTransition(async () => {
			try {
				await deleteInventory(inventory.id);
				toast.success("Inventaris berhasil dihapus.");
				router.push("/inventory");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error
						? error.message
						: "Gagal menghapus inventaris.";
				toast.error(message);
			}
		});
	};

	const openDeleteModal = (item: ItemRecord) => {
		setSelectedItem(item);
		setIsDeleteOpen(true);
	};

	const handleAddItem = () => {
		if (!itemName.trim()) {
			toast.error("Nama barang wajib diisi.");
			return;
		}

		startTransition(async () => {
			try {
				const newItem = await addInventoryItem(inventory.id, {
					name: itemName,
					sku: itemSku,
					description: itemDesc,
					quantity: itemQty,
					unit: itemUnit,
					location: itemLocation,
				});

				setItems((prev) => [newItem, ...prev]);

				// Fetch new transaction list since an IN transaction might be generated
				if (itemQty > 0) {
					// We refresh detail data
					const { getInventoryDetail } =
						await import("@/features/inventory/actions/inventory");
					const fresh = await getInventoryDetail(inventory.id);
					setTransactions(fresh.transactions);
				}

				setIsAddOpen(false);
				setItemName("");
				setItemSku("");
				setItemDesc("");
				setItemQty(0);
				setItemUnit("pcs");
				setItemLocation("");
				toast.success("Barang berhasil ditambahkan.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal menambahkan barang.";
				toast.error(message);
			}
		});
	};

	const handleEditItem = () => {
		if (!selectedItem) return;
		if (!itemName.trim()) {
			toast.error("Nama barang wajib diisi.");
			return;
		}

		startTransition(async () => {
			try {
				const updated = await updateInventoryItem(
					inventory.id,
					selectedItem.id,
					{
						name: itemName,
						sku: itemSku,
						description: itemDesc,
						unit: itemUnit,
						location: itemLocation,
					},
				);

				setItems((prev) =>
					prev.map((item) => (item.id === selectedItem.id ? updated : item)),
				);
				setIsEditOpen(false);
				setSelectedItem(null);
				toast.success("Barang berhasil diubah.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal mengubah barang.";
				toast.error(message);
			}
		});
	};

	const handleDeleteItem = () => {
		if (!selectedItem) return;

		startTransition(async () => {
			try {
				await deleteInventoryItem(inventory.id, selectedItem.id);
				setItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
				setIsDeleteOpen(false);
				setSelectedItem(null);
				toast.success("Barang berhasil dihapus.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal menghapus barang.";
				toast.error(message);
			}
		});
	};

	const handleStockTx = () => {
		if (!selectedItem) return;
		if (txQty <= 0) {
			toast.error("Jumlah transaksi stok harus lebih besar dari 0.");
			return;
		}

		startTransition(async () => {
			try {
				await createStockTransaction(inventory.id, selectedItem.id, {
					type: txType,
					quantity: txQty,
					notes: txNotes,
				});

				// Reload full inventory detail to synchronize stock levels and transaction lists accurately
				const { getInventoryDetail } =
					await import("@/features/inventory/actions/inventory");
				const fresh = await getInventoryDetail(inventory.id);
				setItems(fresh.items);
				setTransactions(fresh.transactions);

				setIsTxOpen(false);
				setSelectedItem(null);
				toast.success("Transaksi stok berhasil dicatat.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal mencatat transaksi.";
				toast.error(message);
			}
		});
	};

	const handleTransferItem = () => {
		if (!selectedItem) return;
		const targetId = Number(transferTargetInventoryId);
		if (!targetId) {
			toast.error("Pilih inventaris tujuan terlebih dahulu.");
			return;
		}
		if (targetId === inventory.id) {
			toast.error(
				"Inventaris tujuan tidak boleh sama dengan inventaris sumber.",
			);
			return;
		}
		if (transferQty <= 0) {
			toast.error("Jumlah transfer harus lebih besar dari 0.");
			return;
		}
		if (transferQty > selectedItem.quantity) {
			toast.error("Jumlah transfer melebihi stok tersedia.");
			return;
		}

		startTransition(async () => {
			try {
				await transferInventoryItem(
					inventory.id,
					targetId,
					selectedItem.id,
					transferQty,
				);

				const { getInventoryDetail } =
					await import("@/features/inventory/actions/inventory");
				const fresh = await getInventoryDetail(inventory.id);
				setItems(fresh.items);
				setTransactions(fresh.transactions);

				setIsTransferOpen(false);
				setSelectedItem(null);
				toast.success("Stok berhasil dipindahkan.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal memindahkan stok.";
				toast.error(message);
			}
		});
	};

	// MEMBER MANAGEMENT LOGIC

	const handleAddMembers = () => {
		if (!canManageMembers) return;
		if (selectedMemberEmails.length === 0) {
			toast.error("Pilih minimal satu pengguna.");
			return;
		}

		startTransition(async () => {
			try {
				const results = await Promise.all(
					selectedMemberEmails.map((email) =>
						addInventoryMember(inventory.id, {
							email,
							role: "VIEWER",
						}),
					),
				);

				setMembers((prev) => [...prev, ...results]);
				setIsAddMemberOpen(false);
				setSelectedMemberEmails([]);
				setMemberPickerSearch("");
				toast.success("Anggota berhasil ditambahkan.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal menambahkan anggota.";
				toast.error(message);
			}
		});
	};

	const toggleMemberCandidate = (email: string) => {
		setSelectedMemberEmails((prev) =>
			prev.includes(email)
				? prev.filter((value) => value !== email)
				: [...prev, email],
		);
	};

	const handleRemoveMember = () => {
		if (!selectedMember) return;

		startTransition(async () => {
			try {
				await removeInventoryMember(inventory.id, selectedMember.id);
				setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
				setIsDeleteMemberOpen(false);
				setSelectedMember(null);
				toast.success("Akses anggota berhasil dicabut.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal menghapus anggota.";
				toast.error(message);
			}
		});
	};

	const handleRoleChange = (
		memberId: number,
		role: "OWNER" | "EDITOR" | "VIEWER",
	) => {
		startTransition(async () => {
			try {
				const updated = await updateInventoryMemberRole(
					inventory.id,
					memberId,
					role,
				);
				setMembers((prev) =>
					prev.map((m) =>
						m.id === memberId ? { ...m, role: updated.role } : m,
					),
				);
				toast.success("Peran anggota berhasil diperbarui.");
				router.refresh();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Gagal mengubah peran.";
				toast.error(message);
			}
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in-50 duration-300">
			{/* Back Button and Basic Header */}
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderBack onClick={() => router.back()} />
					{canManageInventory ? (
						<form
							id="inventory-name-form"
							className="flex-1"
							onSubmit={(e) => {
								e.preventDefault();
								handleSaveInventoryName();
							}}
						>
							<Input
								placeholder="Contoh: Lab Komputer"
								value={inventoryName}
								onChange={(e) => setInventoryName(e.target.value)}
								className="text-2xl! h-12 font-bold"
								disabled={isPending}
							/>
						</form>
					) : (
						<PageHeaderTitle>{inventory.name}</PageHeaderTitle>
					)}
				</PageHeaderHeading>
				{canManageInventory && (
					<PageHeaderActions>
						<Button
							type="submit"
							form="inventory-name-form"
							disabled={isPending || !isInventoryNameDirty}
						>
							Simpan Perubahan
						</Button>
						{canDeleteInventory && (
							<Button
								variant="destructive"
								onClick={() => setIsDeleteInventoryOpen(true)}
								disabled={isPending}
							>
								Hapus Inventaris
							</Button>
						)}
					</PageHeaderActions>
				)}
			</PageHeader>

			<Tabs defaultValue="items">
				<TabsList variant="line">
					<TabsTrigger value="items">
						<Boxes className="h-4.5 w-4.5" />
						Barang
					</TabsTrigger>
					<TabsTrigger value="members">
						<Users className="h-4.5 w-4.5" />
						Anggota
					</TabsTrigger>
					<TabsTrigger value="transactions">
						<History className="h-4.5 w-4.5" />
						Riwayat
					</TabsTrigger>
				</TabsList>

				{/* TAB 1: ITEMS */}
				<TabsContent
					value="items"
					className="rounded-md border bg-background mt-4"
				>
					<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
						<InputGroup>
							<InputGroupAddon>
								<Search />
							</InputGroupAddon>
							<InputGroupInput
								placeholder="Cari barang, SKU, atau lokasi..."
								value={itemSearch}
								onChange={(e) => setItemSearch(e.target.value)}
							/>
						</InputGroup>
						{canEdit && (
							<Button
								onClick={() => setIsAddOpen(true)}
								className="w-full sm:w-auto shadow-md"
							>
								<Plus className="mr-2 h-4 w-4" />
								Tambah Barang
							</Button>
						)}
					</div>

					<Table>
						<TableBody>
							{filteredItems.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={canEdit ? 5 : 4}
										className="h-32 text-center text-muted-foreground"
									>
										{itemSearch
											? "Tidak ditemukan barang yang cocok dengan pencarian."
											: "Belum ada barang di inventaris ini."}
									</TableCell>
								</TableRow>
							) : (
								filteredItems.map((item) => (
									<TableRow key={item.id}>
										<TableCell className="pl-4">{item.name}</TableCell>
										<TableCell>{item.sku ? item.sku : "-"}</TableCell>
										<TableCell>{item.location ? item.location : "-"}</TableCell>
										<TableCell className="tabular-nums">
											{item.quantity} {item.unit}
										</TableCell>
										{canEdit && (
											<TableCell className="flex justify-end pr-4">
												<ButtonGroup>
													<Button
														size="icon"
														variant="outline"
														aria-label="Mutasi Stok"
														onClick={() => openTxModal(item)}
													>
														<ArrowLeftRight />
													</Button>
													<Button
														size="icon"
														variant="outline"
														aria-label="Transfer Barang"
														onClick={() => openTransferModal(item)}
													>
														<ArrowUpDown />
													</Button>
													<Button
														size="icon"
														variant="outline"
														aria-label="Ubah Barang"
														onClick={() => openEditModal(item)}
													>
														<Edit />
													</Button>
													<Button
														size="icon"
														variant="outline"
														aria-label="Hapus Barang"
														onClick={() => openDeleteModal(item)}
													>
														<Trash2 className="text-destructive" />
													</Button>
												</ButtonGroup>
											</TableCell>
										)}
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TabsContent>

				{/* TAB 2: ACCESS MEMBERS */}
				<TabsContent
					value="members"
					className="rounded-md border bg-background mt-4"
				>
					<Table>
						<TableBody>
							{members.map((member) => (
								<TableRow key={member.id}>
									<TableCell className="font-bold text-base pl-4">
										{
											workspaceUserMap.get(member.email.toLowerCase())?.name
												?.fullName
										}
										{member.email === userEmail && (
											<span className="ml-2 font-semibold text-muted-foreground bg-muted border px-1.5 py-0.5 rounded">
												Anda
											</span>
										)}
									</TableCell>
									<TableCell className="flex justify-end pr-4">
										<ButtonGroup>
											<Select
												defaultValue={member.role}
												onValueChange={(val) =>
													handleRoleChange(
														member.id,
														val as "OWNER" | "EDITOR" | "VIEWER",
													)
												}
												disabled={
													isPending ||
													member.email === userEmail ||
													!canManageMembers
												}
											>
												<SelectTrigger className="h-8 w-40 font-semibold">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="OWNER">Pemilik</SelectItem>
													<SelectItem value="EDITOR">Editor</SelectItem>
													<SelectItem value="VIEWER">Pengunjung</SelectItem>
												</SelectContent>
											</Select>
											<Button
												variant="outline"
												size="icon"
												disabled={
													member.email === userEmail ||
													isPending ||
													!canManageMembers
												}
												onClick={() => {
													setSelectedMember(member);
													setIsDeleteMemberOpen(true);
												}}
												title="Cabut Akses Anggota"
											>
												<UserMinus className="text-destructive" />
											</Button>
										</ButtonGroup>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{canManageMembers && (
						<div className="flex justify-center gap-4 p-4">
							<Button
								onClick={() => {
									setMemberPickerSearch("");
									setSelectedMemberEmails([]);
									setIsAddMemberOpen(true);
								}}
								className="w-fit"
							>
								<UserPlus />
								Berikan Akses
							</Button>
						</div>
					)}
				</TabsContent>

				{/* TAB 3: TRANSACTION AUDIT LOGS */}
				<TabsContent
					value="transactions"
					className="rounded-md border bg-background mt-4"
				>
					<Table>
						<TableBody>
							{transactions.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="h-32 text-center text-muted-foreground"
									>
										Belum ada transaksi log yang dicatat.
									</TableCell>
								</TableRow>
							) : (
								transactions.map((tx) => {
									const item = itemsMap.get(tx.itemId);
									return (
										<TableRow key={tx.id}>
											<TableCell className="tabular-nums">
												{new Date(tx.createdAt).toLocaleString("id-ID")}
											</TableCell>
											<TableCell>
												{item ? item.name : `Barang (ID: ${tx.itemId})`}
											</TableCell>
											<TableCell className="flex items-center justify-center gap-2 tabular-nums">
												<span
													className={
														(tx.quantity > 0
															? "text-emerald-600"
															: tx.quantity < 0
																? "text-rose-600"
																: "text-muted-foreground") + " font-bold"
													}
												>
													{tx.quantity > 0
														? `${tx.quantity}`
														: Math.abs(tx.quantity)}{" "}
													{item?.unit || "pcs"}
												</span>
												<Badge
													variant="outline"
													className={`flex items-center gap-1 ${
														tx.type === "IN"
															? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
															: tx.type === "OUT"
																? "bg-rose-500/10 text-rose-600 border-rose-500/20"
																: "bg-amber-500/10 text-amber-600 border-amber-500/20"
													}`}
												>
													{tx.type === "IN" ? (
														<ArrowDownLeft className="h-3.5 w-3.5" />
													) : tx.type === "OUT" ? (
														<ArrowUpRight className="h-3.5 w-3.5" />
													) : (
														<Settings2 className="h-3.5 w-3.5" />
													)}
													{tx.type === "IN"
														? "Masuk"
														: tx.type === "OUT"
															? "Keluar"
															: "Penyesuaian"}
												</Badge>
											</TableCell>
											<TableCell
												className="text-muted-foreground max-w=50 truncate"
												title={tx.notes || ""}
											>
												{tx.notes || "-"}
											</TableCell>
											<TableCell
												className="text-xs text-muted-foreground truncate"
												title={tx.createdByEmail}
											>
												{tx.createdByEmail}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</TabsContent>
			</Tabs>

			{/* DIALOGS FOR ITEMS */}

			{/* Add Item Dialog */}
			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Tambah Barang Inventaris</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
						<Input
							placeholder="Nama Barang"
							value={itemName}
							onChange={(e) => setItemName(e.target.value)}
							disabled={isPending}
						/>

						<div className="grid grid-cols-2 gap-4">
							<Input
								placeholder="SKU / Kode Barang (Opsional)"
								value={itemSku}
								onChange={(e) => setItemSku(e.target.value)}
								disabled={isPending}
							/>
							<Input
								placeholder="Lokasi (Opsional)"
								value={itemLocation}
								onChange={(e) => setItemLocation(e.target.value)}
								disabled={isPending}
							/>
						</div>
						<div className="flex gap-4">
							<Input
								type="number"
								value={itemQty}
								onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
								disabled={isPending}
								min={0}
							/>
							<Input
								placeholder="Contoh: pcs, unit, box, rim"
								value={itemUnit}
								className="w-16"
								onChange={(e) => setItemUnit(e.target.value)}
								disabled={isPending}
							/>
						</div>

						<Textarea
							placeholder="Spesifikasi barang atau catatan penting lainnya..."
							value={itemDesc}
							onChange={(e) => setItemDesc(e.target.value)}
							disabled={isPending}
							rows={2}
						/>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button onClick={handleAddItem} disabled={isPending}>
							{isPending ? "Menyimpan..." : "Simpan Barang"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Item Dialog */}
			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Ubah Informasi Barang</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
						<Input
							placeholder="Nama Barang"
							value={itemName}
							onChange={(e) => setItemName(e.target.value)}
							disabled={isPending}
						/>
						<div className="grid grid-cols-2 gap-4">
							<Input
								placeholder="SKU / Kode Barang (Opsional)"
								value={itemSku}
								onChange={(e) => setItemSku(e.target.value)}
								disabled={isPending}
							/>
							<Input
								placeholder="Lokasi (Opsional)"
								value={itemLocation}
								onChange={(e) => setItemLocation(e.target.value)}
								disabled={isPending}
							/>
						</div>
						<Textarea
							placeholder="Spesifikasi barang atau catatan penting lainnya..."
							value={itemDesc}
							onChange={(e) => setItemDesc(e.target.value)}
							disabled={isPending}
							rows={2}
						/>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button onClick={handleEditItem} disabled={isPending}>
							{isPending ? "Menyimpan..." : "Simpan Perubahan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Stock Mutate (IN/OUT) Dialog */}
			<Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mutasi Stok: {selectedItem?.name}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="p-3 bg-muted/30 border rounded-lg flex justify-between items-center font-mono">
							<span>Stok Saat Ini:</span>
							<span className="font-bold text-foreground">
								{selectedItem?.quantity} {selectedItem?.unit}
							</span>
						</div>
						<div className="flex gap-4">
							<ButtonGroup className="flex-1">
								<Button
									type="button"
									variant={txType === "IN" ? "default" : "outline"}
									onClick={() => setTxType("IN")}
									disabled={isPending}
									className={
										(txType === "IN" &&
											"bg-emerald-600 hover:bg-emerald-700 font-bold") +
										" flex-1"
									}
								>
									<ArrowUpRight className="h-4 w-4 mr-1.5" />
									Masuk
								</Button>
								<Button
									type="button"
									variant={txType === "OUT" ? "default" : "outline"}
									onClick={() => setTxType("OUT")}
									disabled={isPending}
									className={
										(txType === "OUT" &&
											"bg-rose-600 hover:bg-rose-700 font-bold") + " flex-1"
									}
								>
									<ArrowDownLeft className="h-4 w-4 mr-1.5" />
									Keluar
								</Button>
							</ButtonGroup>
							<InputGroup className="w-20">
								<InputGroupInput
									type="number"
									value={txQty}
									onChange={(e) => setTxQty(parseInt(e.target.value) || 1)}
									disabled={isPending}
									min={1}
								/>
								<InputGroupAddon align="inline-end">
									{selectedItem?.unit}
								</InputGroupAddon>
							</InputGroup>
						</div>
						<Textarea
							placeholder="Catatan mutasi, misal: Pembelian barang baru, Barang rusak/hilang, Peminjaman..."
							value={txNotes}
							onChange={(e) => setTxNotes(e.target.value)}
							disabled={isPending}
							rows={2}
						/>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button
							onClick={handleStockTx}
							disabled={isPending}
							className={
								txType === "IN"
									? "bg-emerald-600 hover:bg-emerald-700"
									: "bg-rose-600 hover:bg-rose-700"
							}
						>
							{isPending ? "Memproses..." : "Catat Mutasi"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Transfer Dialog */}
			<Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Transfer Stok: {selectedItem?.name}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="p-3 bg-muted/30 border rounded-lg flex justify-between items-center font-mono">
							<span>Stok Tersedia:</span>
							<span className="font-bold text-foreground">
								{selectedItem?.quantity} {selectedItem?.unit}
							</span>
						</div>
						<Select
							value={transferTargetInventoryId}
							onValueChange={setTransferTargetInventoryId}
							disabled={isPending}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Pilih inventaris tujuan" />
							</SelectTrigger>
							<SelectContent>
								{transferInventories.length === 0 ? (
									<SelectItem value="__none" disabled>
										Belum ada inventaris tujuan tersedia
									</SelectItem>
								) : (
									transferInventories.map((inv) => (
										<SelectItem key={inv.id} value={String(inv.id)}>
											{inv.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
						<InputGroup>
							<InputGroupInput
								type="number"
								min={1}
								max={selectedItem?.quantity || 1}
								value={transferQty}
								onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
								disabled={isPending}
							/>
							<InputGroupAddon align="inline-end">
								{selectedItem?.unit}
							</InputGroupAddon>
						</InputGroup>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button
							onClick={handleTransferItem}
							disabled={isPending || transferInventories.length === 0}
						>
							{isPending ? "Memproses..." : "Pindahkan Stok"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Item Delete Dialog */}
			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-destructive">
							Hapus Barang Dari Inventaris?
						</DialogTitle>
					</DialogHeader>
					<div className="py-2 text-sm">
						Apakah Anda yakin ingin menghapus barang{" "}
						<span className="font-bold text-foreground">
							&quot;{selectedItem?.name}&quot;
						</span>
						?
						<p className="text-xs text-muted-foreground mt-2 italic">
							* Tindakan ini akan menghapus data barang beserta seluruh riwayat
							transaksi stok barang tersebut.
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleDeleteItem}
							disabled={isPending}
						>
							{isPending ? "Menghapus..." : "Ya, Hapus Barang"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Inventory Delete Dialog */}
			<Dialog
				open={isDeleteInventoryOpen}
				onOpenChange={setIsDeleteInventoryOpen}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-destructive">
							Hapus Inventaris?
						</DialogTitle>
					</DialogHeader>
					<div className="py-2 text-sm space-y-2">
						<p>
							Apakah Anda yakin ingin menghapus inventaris{" "}
							<span className="font-bold text-foreground">
								{inventory.name}
							</span>
							?
						</p>
						<p className="text-xs text-muted-foreground font-semibold">
							Tindakan ini permanen dan akan menghapus seluruh data barang,
							riwayat transaksi stok, file, dan akses anggota di inventaris ini.
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleDeleteInventory}
							disabled={isPending}
						>
							{isPending ? "Menghapus..." : "Ya, Hapus Inventaris"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* DIALOGS FOR MEMBERS */}

			{/* Add Member Dialog */}
			<Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Berikan Akses Inventaris</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<InputGroup>
							<InputGroupAddon>
								<Search />
							</InputGroupAddon>
							<InputGroupInput
								placeholder="Cari nama atau email..."
								value={memberPickerSearch}
								onChange={(e) => setMemberPickerSearch(e.target.value)}
								disabled={isPending}
							/>
						</InputGroup>
						<div className="space-y-2 max-h-80 overflow-y-auto">
							{candidateUsers.length === 0 ? (
								<div className="p-4 text-sm text-muted-foreground text-center">
									Tidak ada pengguna yang cocok.
								</div>
							) : (
								candidateUsers.map((user) => {
									const email = user.primaryEmail || "";
									const label = user.name?.fullName;
									const checked = selectedMemberEmails.includes(email);
									return (
										<FieldLabel key={email}>
											<Field orientation="horizontal">
												<Checkbox
													checked={checked}
													onCheckedChange={() => toggleMemberCandidate(email)}
												/>
												<FieldContent>
													<FieldTitle>{label}</FieldTitle>
													<FieldDescription>{email}</FieldDescription>
												</FieldContent>
											</Field>
										</FieldLabel>
									);
								})
							)}
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button onClick={handleAddMembers} disabled={isPending}>
							{isPending ? "Menyimpan..." : "Berikan Akses"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Member Revoke Dialog */}
			<Dialog open={isDeleteMemberOpen} onOpenChange={setIsDeleteMemberOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-destructive">
							Cabut Akses Pengguna?
						</DialogTitle>
					</DialogHeader>
					<div className="text-sm">
						<div className="font-bold text-foreground text-center bg-muted/50 p-2.5 rounded border">
							{selectedMember?.email}
						</div>
						<p className="text-xs text-muted-foreground mt-3 leading-relaxed">
							* Akun tersebut tidak akan lagi memiliki izin untuk mengakses,
							melihat, atau memanipulasi inventaris ini.
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Batal
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleRemoveMember}
							disabled={isPending}
						>
							{isPending ? "Mencabut..." : "Ya, Cabut Akses"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
