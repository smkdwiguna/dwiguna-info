"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="icon" className="w-9 h-9 shrink-0">
				<span className="sr-only">Toggle theme</span>
			</Button>
		);
	}

	const cycleTheme = () => {
		if (theme === "light") {
			setTheme("dark");
		} else if (theme === "dark") {
			setTheme("system");
		} else {
			setTheme("light");
		}
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={cycleTheme}
			className="w-9 h-9 shrink-0"
			title={`Tema saat ini: ${theme}`}
		>
			{theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem]" />}
			{theme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem]" />}
			{theme === "system" && <Monitor className="h-[1.2rem] w-[1.2rem]" />}
			<span className="sr-only">Ubah tema</span>
		</Button>
	);
}
