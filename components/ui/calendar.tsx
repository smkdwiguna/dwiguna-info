"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	const defaults = getDefaultClassNames();

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				root: cn(defaults.root, "w-fit"),
				months: "relative flex flex-col gap-4 sm:flex-row",
				month: "flex w-full flex-col gap-4",
				nav: "absolute top-0 flex w-full items-center justify-between px-1",
				button_previous: cn(
					"inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40",
				),
				button_next: cn(
					"inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40",
				),
				month_caption:
					"flex h-7 items-center justify-center text-sm font-medium",
				weekdays: "flex",
				weekday:
					"w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
				week: "mt-2 flex w-full",
				day: cn(
					"relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
				),
				day_button: cn(
					"inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
				),
				today: "rounded-md bg-accent/60 font-semibold text-accent-foreground",
				selected:
					"[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
				outside: "text-muted-foreground/50",
				disabled: "text-muted-foreground/40 opacity-50",
				hidden: "invisible",
				...classNames,
			}}
			components={{
				Chevron: ({ orientation }) =>
					orientation === "left" ? (
						<CaretLeft className="h-4 w-4" />
					) : (
						<CaretRight className="h-4 w-4" />
					),
			}}
			{...props}
		/>
	);
}

export { Calendar };
