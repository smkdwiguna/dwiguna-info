import Image from "next/image";

type BrandLogoProps = {
	alt?: string;
	className?: string;
	imageClassName?: string;
	width?: number;
	height?: number;
	priority?: boolean;
};

export function BrandLogo({
	alt = "Logo SMK TI Dwiguna",
	className,
	imageClassName,
	width = 300,
	height = 48,
	priority,
}: BrandLogoProps) {
	return (
		<div className={className}>
			<Image
				src="/Mark.png"
				alt={alt}
				width={width}
				height={height}
				priority={priority}
				className={
					imageClassName ? `dark:hidden ${imageClassName}` : "dark:hidden"
				}
			/>
			<Image
				src="/Mark-Dark.png"
				alt={alt}
				width={width}
				height={height}
				priority={priority}
				className={
					imageClassName
						? `hidden dark:block ${imageClassName}`
						: "hidden dark:block"
				}
			/>
		</div>
	);
}
