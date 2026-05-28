import { Spinner, type SpinnerProps } from "@/components/spinner";
import { cn } from "@/lib/utils";

interface SuspenseSpinnerProps {
	className?: string;
	spinnerClassName?: string;
	size?: SpinnerProps["size"];
	variant?: SpinnerProps["variant"];
}

export function SuspenseSpinner({
	className,
	spinnerClassName,
	size = "lg",
	variant = "muted",
}: SuspenseSpinnerProps) {
	return (
		<div className={cn("flex items-center justify-center", className)}>
			<Spinner className={spinnerClassName} size={size} variant={variant} />
		</div>
	);
}
