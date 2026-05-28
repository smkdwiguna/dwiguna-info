import { Spinner } from "@/components/spinner";
import { BrandLogo } from "@/components/brand-logo";

export default function Loading() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/20 p-4">
			<BrandLogo
				className="h-10 w-fit"
				imageClassName="h-10 w-auto"
				width={250}
				height={40}
			/>
			<Spinner variant="muted" />
		</div>
	);
}
