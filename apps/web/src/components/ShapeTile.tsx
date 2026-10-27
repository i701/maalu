import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import shapes from "#/assets/shapes.json";

const MASKS = (shapes as string[]).map(
	(svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
);

/**
 * An icon on a tinted, polygon-shaped blob (one of eight shapes). The blob is masked, so it can
 * rotate on its own: give a parent `"&:hover .shape-bg": { transform: ... }` (or use
 * `shapeHover` below) and the shape turns on the slow spatial spring while the icon stays upright.
 */
export default function ShapeTile({
	shape = 0,
	accent,
	size = 44,
	bg,
	fg,
	children,
}: {
	/** 0-7, which polygon */
	shape?: number;
	/** CSS colour the tile is tinted with */
	accent?: string;
	size?: number;
	/** Override the tinted background / icon colour (e.g. translucent white on a gradient) */
	bg?: string;
	fg?: string;
	children: ReactNode;
}) {
	return (
		<Box
			sx={{
				position: "relative",
				width: size,
				height: size,
				display: "grid",
				placeItems: "center",
				flexShrink: 0,
			}}
		>
			<Box
				aria-hidden
				className="shape-bg"
				sx={{
					position: "absolute",
					inset: 0,
					maskImage: MASKS[shape % MASKS.length],
					WebkitMaskImage: MASKS[shape % MASKS.length],
					maskSize: "100% 100%",
					WebkitMaskSize: "100% 100%",
					bgcolor:
						bg ?? `color-mix(in oklab, ${accent} 30%, var(--md-sys-color-surface-container-low))`,
					transition: "transform var(--spring-spatial-slow-dur) var(--spring-spatial-slow)",
				}}
			/>
			<Box
				sx={{
					position: "relative",
					display: "grid",
					color: fg ?? `color-mix(in oklab, ${accent} 80%, var(--md-sys-color-on-surface))`,
				}}
			>
				{children}
			</Box>
		</Box>
	);
}
