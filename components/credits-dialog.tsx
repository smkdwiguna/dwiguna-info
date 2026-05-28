"use client";

import { useState } from "react";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./brand-logo";
import {
	InstagramLogoIcon,
	LinkedinLogoIcon,
	TiktokLogoIcon,
	YoutubeLogoIcon,
	FacebookLogoIcon,
	XLogoIcon,
	GithubLogoIcon,
} from "@phosphor-icons/react";

interface SocialMedia {
	name: string;
	url: string;
	icon: React.ReactNode;
}

const socialMediaList: SocialMedia[] = [
	{
		name: "Instagram",
		url: "instagram.com/smktidwiguna",
		icon: <InstagramLogoIcon size={24} />,
	},
	{
		name: "Facebook",
		url: "facebook.com/smk.dwiguna",
		icon: <FacebookLogoIcon size={24} />,
	},
	{
		name: "TikTok",
		url: "tiktok.com/@smktidwiguna",
		icon: <TiktokLogoIcon size={24} />,
	},
	{
		name: "LinkedIn",
		url: "linkedin.com/school/smkdwiguna",
		icon: <LinkedinLogoIcon size={24} />,
	},
	{
		name: "YouTube",
		url: "youtube.com/@smkdwiguna",
		icon: <YoutubeLogoIcon size={24} />,
	},
	{
		name: "X",
		url: "x.com/smktidwiguna",
		icon: <XLogoIcon size={24} />,
	},
];

export function CreditsDialog() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className="text-xs text-muted-foreground no-underline hover:text-foreground"
				onClick={() => setOpen(true)}
			>
				&copy; 2026 SMK TI Dwiguna
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							<BrandLogo
								className="h-10 w-fit"
								imageClassName="h-10 w-auto"
								width={250}
								height={40}
							/>
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
						{socialMediaList.map((social) => (
							<Link
								key={social.name}
								href={`https://${social.url}`}
								target="_blank"
								rel="noopener noreferrer"
								className="block p-4 rounded-lg border border-border hover:bg-accent transition-colors"
							>
								<div className="flex items-center gap-3">
									{social.icon}
									<div>
										<h3 className="font-semibold">{social.name}</h3>
										<p className="text-sm text-muted-foreground">
											{social.url}
										</p>
									</div>
								</div>
							</Link>
						))}
					</div>
					<DialogFooter className="justify-between">
						<span>Qeis Ismail</span>
						<span>
							<Link
								href="https://github.com/smkdwiguna/dwiguna-info"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button variant="outline">
									Repositori
									<GithubLogoIcon />
								</Button>
							</Link>
							<Link
								href="https://smkdwiguna.sch.id"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button variant="outline">Situs Web</Button>
							</Link>
						</span>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
