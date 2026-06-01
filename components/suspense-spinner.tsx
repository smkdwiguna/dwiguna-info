import { Spinner, type SpinnerProps } from "@/components/spinner";

interface SuspenseSpinnerProps {
	spinnerClassName?: string;
	size?: SpinnerProps["size"];
	variant?: SpinnerProps["variant"];
}

export function SuspenseSpinner({
	spinnerClassName,
	size = 96,
	variant = "muted",
}: SuspenseSpinnerProps) {
	return (
		<div className="flex min-h-svh w-full items-center justify-center">
			<Spinner className={spinnerClassName} size={size} variant={variant} />
		</div>
	);
}
