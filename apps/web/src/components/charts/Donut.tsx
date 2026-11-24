import Box from "@mui/material/Box";
import type { ReactNode } from "react";

/** A donut of a share (0 to 1) in the colour of the parent (`currentColor`), the rest of the ring
 * the same colour faint, the ends rounded. `children` sit in the middle. Drawn on a 100 box with
 * a path length of 100, so the share is simply the dash length. */
export default function Donut({
	share,
	size = 92,
	thickness = 14,
	children,
}: {
	share: number;
	size?: number;
	/** The ring's width on the 100 box; the outer edge stays put, so a thinner ring is also smaller inside */
	thickness?: number;
	children?: ReactNode;
}) {
	const part = Math.min(1, Math.max(0, share)) * 100;
	const ring = {
		fill: "none",
		strokeWidth: thickness,
		pathLength: 100,
		transform: "rotate(-90 50 50)",
	};
	const radius = 43 - thickness / 2;
	return (
		<Box sx={{ position: "relative", display: "inline-flex", width: size, height: size }}>
			<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
				<circle cx={50} cy={50} r={radius} stroke="currentColor" strokeOpacity={0.28} {...ring} />
				{part > 0 && (
					<circle
						cx={50}
						cy={50}
						r={radius}
						stroke="currentColor"
						strokeDasharray={`${part} ${100 - part}`}
						strokeLinecap="round"
						{...ring}
					/>
				)}
			</svg>
			{children && (
				<Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
					{children}
				</Box>
			)}
		</Box>
	);
}
