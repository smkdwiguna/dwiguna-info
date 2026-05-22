"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export interface UserRow {
	id: string;
	fullName: string;
	nisn?: string;
	nis?: string;
	nuptk?: string;
	tempatTanggalLahir?: string;
}

interface GroupBlock {
	id: string;
	orgUnitPath: string;
	users: UserRow[];
}

function validateDateFormat(dateStr: string): boolean {
	if (!dateStr) return true;
	const regex = /^.+,\s*\d{4}-\d{2}-\d{2}$/;
	if (!regex.test(dateStr)) return false;
	const datePart = dateStr.split(",").pop()?.trim() || "";
	const [year, month, day] = datePart.split("-").map(Number);
	if (month < 1 || month > 12) return false;
	if (day < 1 || day > 31) return false;
	return true;
}

const PREVIEW_USERS_KEY = "bulk-upload-preview-users";

export function BulkUploadClient() {
	const [blocks, setBlocks] = useState<GroupBlock[]>([
		{
			id: crypto.randomUUID(),
			orgUnitPath: "",
			users: [{ id: crypto.randomUUID(), fullName: "" }],
		},
	]);
	const [isProcessing, setIsProcessing] = useState(false);
	const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
	const router = useRouter();

	const addBlock = () => {
		setBlocks([
			...blocks,
			{
				id: crypto.randomUUID(),
				orgUnitPath: "",
				users: [{ id: crypto.randomUUID(), fullName: "" }],
			},
		]);
	};

	const removeBlock = (blockId: string) => {
		if (blocks.length > 1) {
			setBlocks(blocks.filter((b) => b.id !== blockId));
		}
	};

	const updateBlock = (blockId: string, field: string, value: string) => {
		setBlocks(
			blocks.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)),
		);
	};

	const updateUser = (
		blockId: string,
		userId: string,
		field: keyof UserRow,
		value: string,
	) => {
		setBlocks(
			blocks.map((b) => {
				if (b.id === blockId) {
					return {
						...b,
						users: b.users.map((u) =>
							u.id === userId ? { ...u, [field]: value } : u,
						),
					};
				}
				return b;
			}),
		);

		ensureEmptyRow(blockId);
	};

	const removeUser = (blockId: string, userId: string) => {
		setBlocks(
			blocks.map((b) => {
				if (b.id === blockId) {
					return {
						...b,
						users: b.users.filter((u) => u.id !== userId),
					};
				}
				return b;
			}),
		);
	};

	const addEmptyRowIfMissing = (users: UserRow[]) => {
		const hasEmptyRow = users.some((u) => !u.fullName.trim());
		if (!hasEmptyRow && users.length > 0) {
			return [...users, { id: crypto.randomUUID(), fullName: "" }];
		}
		return users;
	};

	const ensureEmptyRow = (blockId: string) => {
		setBlocks((prevBlocks) =>
			prevBlocks.map((b) => {
				if (b.id === blockId) {
					return { ...b, users: addEmptyRowIfMissing(b.users) };
				}
				return b;
			}),
		);
	};

	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
		blockId: string,
		userId: string,
		field: string,
		rowIndex: number,
	) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const block = blocks.find((b) => b.id === blockId);
			if (!block) return;

			const columns = [
				"fullName",
				"nisn",
				"nis",
				"nuptk",
				"tempatTanggalLahir",
			];
			const currentColIndex = columns.indexOf(field);

			if (currentColIndex < columns.length - 1) {
				const nextField = columns[currentColIndex + 1];
				const refKey = `${blockId}-${userId}-${nextField}`;
				setTimeout(() => inputRefs.current.get(refKey)?.focus(), 0);
			} else {
				const nextRowIndex = rowIndex + 1;
				if (nextRowIndex < block.users.length) {
					const nextUserId = block.users[nextRowIndex].id;
					const refKey = `${blockId}-${nextUserId}-fullName`;
					setTimeout(() => inputRefs.current.get(refKey)?.focus(), 0);
				} else {
					ensureEmptyRow(blockId);
					setTimeout(() => {
						const newUser = block.users[block.users.length - 1];
						const refKey = `${blockId}-${newUser.id}-fullName`;
						inputRefs.current.get(refKey)?.focus();
					}, 0);
				}
			}
		}
	};

	const handlePaste = (
		e: React.ClipboardEvent<HTMLInputElement>,
		blockId: string,
		userId: string,
		field: string,
	) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text/plain");
		const lines = pastedText.split("\n");
		const block = blocks.find((b) => b.id === blockId);
		if (!block) return;

		const currentRowIndex = block.users.findIndex((u) => u.id === userId);
		const columns = ["fullName", "nisn", "nis", "nuptk", "tempatTanggalLahir"];
		const currentColIndex = columns.indexOf(field);

		if (lines.length === 1) {
			const cells = lines[0].split("\t");
			let newUsers = [...block.users];

			for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
				const colIdx = currentColIndex + cellIdx;
				if (colIdx >= columns.length) break;

				const colName = columns[colIdx] as keyof UserRow;
				if (currentRowIndex < newUsers.length) {
					newUsers[currentRowIndex] = {
						...newUsers[currentRowIndex],
						[colName]: cells[cellIdx].trim(),
					};
				}
			}

			newUsers = addEmptyRowIfMissing(newUsers);
			setBlocks(
				blocks.map((b) => (b.id === blockId ? { ...b, users: newUsers } : b)),
			);
		} else {
			let newUsers = [...block.users];

			for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
				const rowIdx = currentRowIndex + lineIdx;
				const cells = lines[lineIdx].split("\t");

				if (rowIdx >= newUsers.length) {
					newUsers.push({ id: crypto.randomUUID(), fullName: "" });
				}

				for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
					const colIdx = currentColIndex + cellIdx;
					if (colIdx >= columns.length) break;

					const colName = columns[colIdx] as keyof UserRow;
					newUsers[rowIdx] = {
						...newUsers[rowIdx],
						[colName]: cells[cellIdx].trim(),
					};
				}
			}

			newUsers = addEmptyRowIfMissing(newUsers);
			setBlocks(
				blocks.map((b) => (b.id === blockId ? { ...b, users: newUsers } : b)),
			);
		}
	};

	const handleProcess = async () => {
		const usersToProcess = blocks
			.flatMap((b) => b.users)
			.filter((u) => u.fullName.trim());

		if (usersToProcess.length === 0) {
			toast.error("Tidak ada pengguna untuk diproses");
			return;
		}

		setIsProcessing(true);
		try {
			const { generateUserEmailsWithPasswords } =
				await import("../actions/bulk-upload-actions");

			const groupBlocks = blocks.map((b) => ({
				id: b.id,
				orgUnitPath: b.orgUnitPath || "/",
				users: b.users
					.filter((u) => u.fullName.trim())
					.map(({ fullName, nisn, nis, nuptk, tempatTanggalLahir }) => ({
						fullName,
						nisn,
						nis,
						nuptk,
						tempatTanggalLahir,
					})),
			}));

			const result = await generateUserEmailsWithPasswords(groupBlocks);
			if (result.success && result.users) {
				sessionStorage.setItem(
					PREVIEW_USERS_KEY,
					JSON.stringify(result.users),
				);
				router.push("/bulk-upload/preview");
			} else {
				toast.error("Gagal memproses data: " + result.error);
			}
		} catch (error) {
			console.error(error);
			toast.error("Terjadi kesalahan saat memproses data.");
		} finally {
			setIsProcessing(false);
		}
	};

	const totalUsers = blocks.reduce(
		(acc, b) => acc + b.users.filter((u) => u.fullName.trim()).length,
		0,
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tambah Pengguna</h1>
				</div>
				<div className="flex gap-2 flex-wrap">
					<Button onClick={addBlock} variant="outline" size="sm">
						Tambah Unit
					</Button>
					<Button
						onClick={handleProcess}
						disabled={isProcessing || totalUsers === 0}
						size="sm"
					>
						<Users className="h-4 w-4" /> Proses {totalUsers} Pengguna
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6">
				{blocks.map((block, blockIdx) => (
					<Card key={block.id}>
						<CardHeader className="flex flex-row items-start justify-between w-full">
							<div className="space-y-1 w-full">
								<div className="flex gap-2 items-center">
									<Input
										placeholder="contoh: /Siswa/2026/PPLG-1"
										value={block.orgUnitPath}
										onChange={(e) =>
											updateBlock(block.id, "orgUnitPath", e.target.value)
										}
										className="flex-1"
									/>
									{blocks.length > 1 && (
										<Button
											variant="ghost"
											size="icon"
											className="text-destructive"
											onClick={() => removeBlock(block.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									)}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="overflow-x-auto">
								<Table className="border">
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">#</TableHead>
											<TableHead>Nama Lengkap</TableHead>
											<TableHead>NISN</TableHead>
											<TableHead>NIS</TableHead>
											<TableHead>NUPTK</TableHead>
											<TableHead>Tempat, Tanggal Lahir</TableHead>
											<TableHead className="w-10"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{block.users.map((user, idx) => (
											<TableRow
												key={user.id}
												className={!user.fullName.trim() ? "opacity-50" : ""}
											>
												<TableCell className="text-xs text-muted-foreground">
													{idx + 1}
												</TableCell>
												<TableCell>
													<Input
														ref={(el) => {
															if (el)
																inputRefs.current.set(
																	`${block.id}-${user.id}-fullName`,
																	el,
																);
														}}
														placeholder="Nama"
														value={user.fullName}
														onChange={(e) =>
															updateUser(
																block.id,
																user.id,
																"fullName",
																e.target.value,
															)
														}
														onKeyDown={(e) =>
															handleKeyDown(
																e,
																block.id,
																user.id,
																"fullName",
																idx,
															)
														}
														onPaste={(e) =>
															handlePaste(e, block.id, user.id, "fullName")
														}
														className="h-8"
													/>
												</TableCell>
												<TableCell>
													<Input
														ref={(el) => {
															if (el)
																inputRefs.current.set(
																	`${block.id}-${user.id}-nisn`,
																	el,
																);
														}}
														placeholder="NISN"
														value={user.nisn || ""}
														onChange={(e) =>
															updateUser(
																block.id,
																user.id,
																"nisn",
																e.target.value,
															)
														}
														onKeyDown={(e) =>
															handleKeyDown(e, block.id, user.id, "nisn", idx)
														}
														onPaste={(e) =>
															handlePaste(e, block.id, user.id, "nisn")
														}
														className="h-8"
													/>
												</TableCell>
												<TableCell>
													<Input
														ref={(el) => {
															if (el)
																inputRefs.current.set(
																	`${block.id}-${user.id}-nis`,
																	el,
																);
														}}
														placeholder="NIS"
														value={user.nis || ""}
														onChange={(e) =>
															updateUser(
																block.id,
																user.id,
																"nis",
																e.target.value,
															)
														}
														onKeyDown={(e) =>
															handleKeyDown(e, block.id, user.id, "nis", idx)
														}
														onPaste={(e) =>
															handlePaste(e, block.id, user.id, "nis")
														}
														className="h-8"
													/>
												</TableCell>
												<TableCell>
													<Input
														ref={(el) => {
															if (el)
																inputRefs.current.set(
																	`${block.id}-${user.id}-nuptk`,
																	el,
																);
														}}
														placeholder="NUPTK"
														value={user.nuptk || ""}
														onChange={(e) =>
															updateUser(
																block.id,
																user.id,
																"nuptk",
																e.target.value,
															)
														}
														onKeyDown={(e) =>
															handleKeyDown(e, block.id, user.id, "nuptk", idx)
														}
														onPaste={(e) =>
															handlePaste(e, block.id, user.id, "nuptk")
														}
														className="h-8"
													/>
												</TableCell>
												<TableCell>
													<Input
														ref={(el) => {
															if (el)
																inputRefs.current.set(
																	`${block.id}-${user.id}-tempatTanggalLahir`,
																	el,
																);
														}}
														placeholder="Jakarta, 2000-01-15"
														value={user.tempatTanggalLahir || ""}
														onChange={(e) =>
															updateUser(
																block.id,
																user.id,
																"tempatTanggalLahir",
																e.target.value,
															)
														}
														onKeyDown={(e) =>
															handleKeyDown(
																e,
																block.id,
																user.id,
																"tempatTanggalLahir",
																idx,
															)
														}
														onPaste={(e) =>
															handlePaste(
																e,
																block.id,
																user.id,
																"tempatTanggalLahir",
															)
														}
														className={`h-8 ${
															user.tempatTanggalLahir &&
															!validateDateFormat(user.tempatTanggalLahir)
																? "border-red-500"
																: ""
														}`}
													/>
												</TableCell>
												<TableCell>
													{user.fullName.trim() && (
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6 text-destructive"
															onClick={() => removeUser(block.id, user.id)}
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
