import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import { frameAt, morphPath } from "#/lib/loading-shapes";
import { useReducedMotion } from "#/lib/motion";

/**
 * The Material 3 Expressive loading indicator: a solid shape that morphs between seven shapes while
 * it turns, in place of a spinner. Geometry and motion are ported from the Android implementation
 * (see lib/loading-shapes.ts). Sizes follow the spec: the box is 48dp by default and the shape 38dp.
 *
 * - default: the shape in the primary colour
 * - `contained`: on a primary-container circle, the shape in on-primary-container
 * - `color="inherit"`: takes the surrounding text colour (used inside buttons)
 *
 * The animation writes straight to the SVG each frame instead of re-rendering React. With reduced
 * motion the shape stays still and gently fades in and out.
 */
export default function LoadingIndicator({
	size = 48,
	contained = false,
	color = "primary",
	label = "Loading",
}: {
	size?: number;
	contained?: boolean;
	color?: "primary" | "inherit";
	label?: string;
}) {
	const reduced = useReducedMotion();
	const pathRef = useRef<SVGPathElement>(null);
	const groupRef = useRef<SVGGElement>(null);

	useEffect(() => {
		if (reduced) return;
		let id = 0;
		const tick = () => {
			const f = frameAt(performance.now());
			pathRef.current?.setAttribute("d", morphPath(f.from, f.to, f.progress));
			groupRef.current?.setAttribute("transform", `rotate(${f.rotation.toFixed(2)} 0.5 0.5)`);
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	}, [reduced]);

	return (
		<Box
			role="progressbar"
			aria-label={label}
			sx={{
				display: "inline-grid",
				placeItems: "center",
				flexShrink: 0,
				width: size,
				height: size,
				borderRadius: "50%",
				bgcolor: contained ? "var(--md-sys-color-primary-container)" : undefined,
				color: contained
					? "var(--md-sys-color-on-primary-container)"
					: color === "inherit"
						? "inherit"
						: "var(--md-sys-color-primary)",
			}}
		>
			<svg
				width={size}
				height={size}
				viewBox="0 0 1 1"
				aria-hidden
				style={reduced ? { animation: "loading-pulse 1.4s ease-in-out infinite" } : undefined}
			>
				<g ref={groupRef}>
					{/* First paint (and server render): the first shape, before the loop takes over. */}
					<path ref={pathRef} d={morphPath(0, 1, 0)} fill="currentColor" />
				</g>
			</svg>
		</Box>
	);
}
