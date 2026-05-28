"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import { Button } from "./button";
import { useRouter } from "next/navigation";

export function PageHeaderBack({
	onClick,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const router = useRouter();
	function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
		if (onClick) return onClick(e);
		if (typeof window !== "undefined") {
			const pathSegments = window.location.pathname.split("/").filter(Boolean);
			const parentPath = "/" + pathSegments.slice(0, -1).join("/");
			router.push(parentPath);
		}
	}

	return (
		<Button size="icon" variant="outline" onClick={handleClick} {...props}>
			<ChevronLeft className="h-4 w-4" />
		</Button>
	);
}

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
				"flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
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
			className={cn(
				"w-full flex gap-2 items-center text-center md:text-left",
				className,
			)}
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
				"flex items-center gap-2 w-full justify-center md:w-auto md:justify-end",
				className,
			)}
			{...props}
		/>
	);
}
