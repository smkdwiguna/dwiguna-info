import * as React from "react";
import { cn } from "@/lib/utils";

export function PageShell({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("space-y-4", className)} {...props} />;
}

export function PageHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
			{...props}
		/>
	);
}

export function PageHeaderHeading({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("w-full text-center sm:text-left", className)}
			{...props}
		/>
	);
}

export function PageHeaderTitle({
	className,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h1
			className={cn("text-2xl font-bold tracking-tight", className)}
			{...props}
		/>
	);
}

export function PageHeaderDescription({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p className={cn("text-sm text-muted-foreground", className)} {...props} />
	);
}

export function PageHeaderActions({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex items-center w-full justify-center sm:w-auto sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}
