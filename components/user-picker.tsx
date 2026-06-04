"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Search, X } from "lucide-react";

export interface UserOption {
	email: string;
	name: string;
}

interface UserPickerProps {
	users: UserOption[];
	/** Selected emails. */
	value: string[];
	onChange: (emails: string[]) => void;
	disabled?: boolean;
	/** Emails to hide from the candidate list (e.g. owner, existing signers). */
	excludeEmails?: string[];
	/** When true, hide the chips of selected emails (useful for single-add flows). */
	hideSelected?: boolean;
	placeholder?: string;
}

/**
 * Searchable, name-first user picker. Displays full names but stores emails.
 */
export function UserPicker({
	users,
	value,
	onChange,
	disabled,
	excludeEmails = [],
	hideSelected = false,
	placeholder = "Cari nama atau email...",
}: UserPickerProps) {
	const [search, setSearch] = useState("");

	const excluded = useMemo(
		() => new Set(excludeEmails.map((e) => e.toLowerCase())),
		[excludeEmails],
	);
	const byEmail = useMemo(
		() => new Map(users.map((u) => [u.email.toLowerCase(), u])),
		[users],
	);

	const candidates = useMemo(() => {
		const term = search.trim().toLowerCase();
		return users
			.filter((u) => {
				const email = u.email.toLowerCase();
				if (excluded.has(email)) return false;
				if (!term) return true;
				return u.name.toLowerCase().includes(term) || email.includes(term);
			})
			.slice(0, 50);
	}, [users, search, excluded]);

	function toggle(email: string) {
		if (value.includes(email)) {
			onChange(value.filter((e) => e !== email));
		} else {
			onChange([...value, email]);
		}
	}

	return (
		<div className="space-y-2">
			{!hideSelected && value.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{value.map((email) => {
						const u = byEmail.get(email.toLowerCase());
						return (
							<Badge key={email} variant="secondary" className="gap-1 pr-1">
								<span className="max-w-[12rem] truncate">
									{u?.name || email}
								</span>
								<button
									type="button"
									onClick={() => toggle(email)}
									disabled={disabled}
									aria-label={`Hapus ${u?.name || email}`}
									className="rounded-full p-0.5 hover:bg-foreground/10"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						);
					})}
				</div>
			)}

			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput
					placeholder={placeholder}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					disabled={disabled}
				/>
			</InputGroup>

			<div
				role="listbox"
				aria-multiselectable
				className="max-h-56 divide-y overflow-y-auto rounded-md border"
			>
				{candidates.length === 0 ? (
					<div className="p-3 text-center text-sm text-muted-foreground">
						Tidak ada pengguna yang cocok.
					</div>
				) : (
					candidates.map((u) => {
						const checked = value.includes(u.email);
						return (
							<div
								key={u.email}
								role="option"
								aria-selected={checked}
								aria-disabled={disabled}
								tabIndex={disabled ? -1 : 0}
								onClick={() => !disabled && toggle(u.email)}
								onKeyDown={(e) => {
									if (disabled) return;
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										toggle(u.email);
									}
								}}
								className="flex w-full cursor-pointer items-center gap-2 p-2 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
							>
								<Checkbox checked={checked} className="pointer-events-none" />
								<span className="min-w-0">
									<span className="block truncate text-sm font-medium">
										{u.name || u.email}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{u.email}
									</span>
								</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
