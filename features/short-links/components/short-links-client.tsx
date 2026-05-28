"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ChevronLeft,
	ChevronRight,
	CircleCheckBig,
	CircleX,
	Copy,
	ExternalLink,
	Loader2,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldError } from "@/components/ui/field";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderHeading,
	PageHeaderTitle,
	PageShell,
} from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	createShortLink,
	deleteShortLink,
	validateShortLinkSlug,
} from "../actions/short-links";
import Link from "next/link";
import { ButtonGroup } from "@/components/ui/button-group";

type ShortLinkRecord = {
	id: number;
	slug: string;
	originalUrl: string;
	createdByEmail: string;
	createdAt: string;
	clickCount: number;
};

type ValidationState =
	| { status: "idle"; message: string }
	| { status: "checking"; message: string }
	| { status: "valid"; message: string; normalizedSlug: string }
	| { status: "invalid"; message: string };

const SLUG_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function formatDateTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleString("id-ID");
}

function isValidTargetUrl(value: string) {
	const normalized = normalizeTargetUrl(value);
	if (!normalized) {
		return false;
	}

	try {
		new URL(normalized);
		return true;
	} catch {
		return false;
	}
}

function normalizeTargetUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
	if (hasProtocol) {
		return trimmed;
	}

	return `https://${trimmed}`;
}

function generateRandomSlugCandidate(length = 8) {
	const bytes = new Uint8Array(length);
	globalThis.crypto.getRandomValues(bytes);

	let output = "";
	for (let index = 0; index < bytes.length; index += 1) {
		output += SLUG_ALPHABET[bytes[index] % SLUG_ALPHABET.length];
	}

	return output;
}

export function ShortLinksClient({
	initialShortLinks,
}: {
	initialShortLinks: ShortLinkRecord[];
}) {
	const router = useRouter();
	const [shortLinks, setShortLinks] = useState(initialShortLinks);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [originalUrl, setOriginalUrl] = useState("");
	const [customSlug, setCustomSlug] = useState("");
	const [slugValidation, setSlugValidation] = useState<ValidationState>({
		status: "idle",
		message: "",
	});
	const [isSlugTouched, setIsSlugTouched] = useState(false);
	const [suggestedSlug, setSuggestedSlug] = useState("");

	const rowsPerPage = 10;

	useEffect(() => {
		setShortLinks(initialShortLinks);
	}, [initialShortLinks]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	useEffect(() => {
		const slug = customSlug.trim();
		if (!slug) {
			setSlugValidation({
				status: "idle",
				message: "",
			});
			return;
		}

		setSlugValidation({
			status: "checking",
			message: "",
		});

		const timeout = window.setTimeout(async () => {
			try {
				const result = await validateShortLinkSlug(slug);
				if (result.valid) {
					setSlugValidation({
						status: "valid",
						message: "",
						normalizedSlug: result.normalizedSlug,
					});
					return;
				}

				setSlugValidation({
					status: "invalid",
					message: result.message,
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Gagal memeriksa slug.";
				setSlugValidation({ status: "invalid", message });
			}
		}, 350);

		return () => window.clearTimeout(timeout);
	}, [customSlug]);

	useEffect(() => {
		if (!isCreateDialogOpen || customSlug.trim()) {
			return;
		}

		let active = true;

		(async () => {
			for (let attempt = 0; attempt < 8; attempt += 1) {
				const candidate = generateRandomSlugCandidate();
				try {
					const result = await validateShortLinkSlug(candidate);
					if (result.valid && active) {
						setSuggestedSlug(result.normalizedSlug || candidate);
						return;
					}
				} catch {
					// Retry with the next candidate when validation fails.
				}
			}

			if (active) {
				setSuggestedSlug(generateRandomSlugCandidate());
			}
		})();

		return () => {
			active = false;
		};
	}, [customSlug, isCreateDialogOpen]);

	const filteredShortLinks = useMemo(() => {
		const term = searchTerm.trim().toLowerCase();
		if (!term) {
			return shortLinks;
		}

		return shortLinks.filter((item) => {
			return [
				item.slug,
				item.originalUrl,
				item.createdByEmail,
				item.createdAt,
				String(item.clickCount),
			].some((value) => value.toLowerCase().includes(term));
		});
	}, [searchTerm, shortLinks]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredShortLinks.length / rowsPerPage),
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const startIndex = (currentPageSafe - 1) * rowsPerPage;
	const paginatedShortLinks = filteredShortLinks.slice(
		startIndex,
		startIndex + rowsPerPage,
	);

	useEffect(() => {
		if (currentPage !== currentPageSafe) {
			setCurrentPage(currentPageSafe);
		}
	}, [currentPage, currentPageSafe]);

	const canSubmit =
		isValidTargetUrl(originalUrl) &&
		!isSubmitting &&
		(customSlug.trim().length === 0 || slugValidation.status === "valid");

	const resetDialog = () => {
		setIsCreateDialogOpen(false);
		setOriginalUrl("");
		setCustomSlug("");
		setSlugValidation({
			status: "idle",
			message: "",
		});
		setIsSlugTouched(false);
		setSuggestedSlug("");
	};

	const handleCreateShortLink = async () => {
		if (!canSubmit) return;

		setIsSubmitting(true);
		try {
			const normalizedOriginalUrl = normalizeTargetUrl(originalUrl);
			setOriginalUrl(normalizedOriginalUrl);

			const created = await createShortLink({
				originalUrl: normalizedOriginalUrl,
				slug: customSlug,
			});
			setShortLinks((previous) => [created, ...previous]);
			toast.success(`Shortlink dibuat: dwiguna.info/${created.slug}`);
			resetDialog();
			router.refresh();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Gagal membuat shortlink.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (shortLinkId: number) => {
		const confirmed = window.confirm("Hapus shortlink ini?");
		if (!confirmed) return;

		try {
			await deleteShortLink(shortLinkId);
			setShortLinks((previous) =>
				previous.filter((item) => item.id !== shortLinkId),
			);
			toast.success("Shortlink dihapus.");
			router.refresh();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Gagal menghapus shortlink.";
			toast.error(message);
		}
	};

	const handleCopy = async (slug: string) => {
		const value = `https://dwiguna.info/${slug}`;
		try {
			await navigator.clipboard.writeText(value);
			toast.success("Shortlink disalin.");
		} catch {
			toast.error("Gagal menyalin shortlink.");
		}
	};

	return (
		<PageShell>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Tautan Singkat</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderActions>
					<Dialog
						open={isCreateDialogOpen}
						onOpenChange={setIsCreateDialogOpen}
					>
						<Button onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className="h-4 w-4" /> Buat Tautan
						</Button>
						<DialogContent className="sm:max-w-xl">
							<DialogHeader>
								<DialogTitle>Buat Tautan</DialogTitle>
							</DialogHeader>

							<div className="space-y-2 pt-2">
								<Field>
									<FieldContent>
										<Input
											id="original-url"
											type="text"
											value={originalUrl}
											onChange={(event) => setOriginalUrl(event.target.value)}
											onBlur={() =>
												setOriginalUrl((previous) =>
													normalizeTargetUrl(previous),
												)
											}
											placeholder="https://contoh.com/halaman"
										/>
									</FieldContent>
								</Field>

								<Field>
									<FieldContent>
										<div className="flex items-stretch overflow-hidden rounded-lg border bg-background">
											<span className="flex items-center border-r bg-muted px-3 text-sm text-muted-foreground">
												dwiguna.info/
											</span>
											<div className="relative flex-1">
												<Input
													id="shortlink-slug"
													value={customSlug}
													onChange={(event) => {
														setCustomSlug(event.target.value);
														setIsSlugTouched(true);
													}}
													placeholder={suggestedSlug || ""}
													className="border-0 px-3 pr-10 shadow-none focus-visible:ring-0"
													aria-invalid={slugValidation.status === "invalid"}
												/>
												<div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
													{slugValidation.status === "checking" ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : slugValidation.status === "valid" &&
													  isSlugTouched ? (
														<CircleCheckBig className="h-4 w-4 text-emerald-600" />
													) : slugValidation.status === "invalid" ? (
														<CircleX className="h-4 w-4 text-destructive" />
													) : null}
												</div>
											</div>
										</div>
										{slugValidation.status === "invalid" ? (
											<FieldError>{slugValidation.message}</FieldError>
										) : null}
									</FieldContent>
								</Field>
							</div>

							<DialogFooter>
								<Button
									variant="outline"
									onClick={resetDialog}
									disabled={isSubmitting}
								>
									Batal
								</Button>
								<Button onClick={handleCreateShortLink} disabled={!canSubmit}>
									{isSubmitting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : null}
									Buat
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</PageHeaderActions>
			</PageHeader>

			<div className="rounded-xl border bg-background shadow-sm">
				<div className="flex relative border-b p-4">
					<Search className="pointer-events-none absolute left-6.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Cari tautan..."
						className="pl-9"
					/>
				</div>

				<div className="overflow-x-auto">
					<Table>
						<TableBody>
							{paginatedShortLinks.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="py-10 text-center text-muted-foreground"
									>
										{shortLinks.length === 0
											? "Belum ada tautan singkat yang dibuat."
											: "Tidak ada hasil yang cocok."}
									</TableCell>
								</TableRow>
							) : (
								paginatedShortLinks.map((item) => (
									<TableRow key={item.id}>
										<TableCell className="font-bold pl-4">
											<Link
												href={item.slug}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1"
											>
												<span>{item.slug}</span>
												<ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
											</Link>
										</TableCell>
										<TableCell className="max-w-md truncate">
											<a
												href={item.originalUrl}
												target="_blank"
												rel="noreferrer"
											>
												{item.originalUrl}
											</a>
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatDateTime(item.createdAt)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{item.clickCount}x diklik
										</TableCell>
										<TableCell className="flex justify-end mr-2">
											<ButtonGroup>
												<Button
													variant="outline"
													size="icon"
													onClick={() => handleCopy(item.slug)}
												>
													<Copy className="h-4 w-4" />
													<span className="sr-only">Salin</span>
												</Button>
												<Button
													variant="outline"
													size="icon"
													onClick={() => handleDelete(item.id)}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
													<span className="sr-only">Hapus</span>
												</Button>
											</ButtonGroup>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground">
						Menampilkan {filteredShortLinks.length === 0 ? 0 : startIndex + 1} -{" "}
						{Math.min(startIndex + rowsPerPage, filteredShortLinks.length)} dari{" "}
						{filteredShortLinks.length} tautan
					</p>
					<div className="flex items-center gap-2 self-end sm:self-auto">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
							disabled={currentPageSafe <= 1}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setCurrentPage((value) => Math.min(totalPages, value + 1))
							}
							disabled={currentPageSafe >= totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</PageShell>
	);
}
