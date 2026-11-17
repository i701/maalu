import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

/** The gap between the filled part and the track, and the stop dot at the track's end (M3 Expressive). */
const GAP = 3;
const DOT = 4;
const SPRING = "var(--spring-spatial-default-dur) var(--spring-spatial-default)";

/**
 * A linear progress bar in the M3 Expressive style: a fully rounded filled part, a small gap, then
 * a fully rounded track that ends in a dot. Both ends spring when the value changes. `tick` marks a
 * target (a percentage) with a thin line across the bar.
 */
export default function ProgressBar({
	percent,
	color,
	height = 8,
	tick,
	label,
	role = "progressbar",
	sx,
}: {
	/** 0 and up; anything past 100 reads as full */
	percent: number;
	/** Any colour `sx` accepts, such as `error.main` or a CSS variable */
	color: string;
	/** In px: one value, or one for phones and one from 600px up */
	height?: number | { xs: number; sm: number };
	tick?: number;
	label?: string;
	/** `img` for a bar that only draws a share and has no live value to announce */
	role?: "progressbar" | "img";
	sx?: SxProps<Theme>;
}) {
	const value = Math.max(0, Math.min(percent, 100));
	const barHeight =
		typeof height === "number" ? `${height}px` : { xs: `${height.xs}px`, sm: `${height.sm}px` };
	// the filled part never gets narrower than it is tall, so a small value still reads as a pill
	const filled = `max(${value}%, var(--bar-h))`;
	return (
		<Box
			role={role}
			aria-label={label}
			{...(role === "progressbar"
				? { "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": value }
				: {})}
			sx={[
				{ "--bar-h": barHeight, position: "relative", height: "var(--bar-h)" },
				...(Array.isArray(sx) ? sx : [sx]),
			]}
		>
			{value > 0 && (
				<Box
					sx={{
						position: "absolute",
						inset: "0 auto 0 0",
						width: filled,
						borderRadius: "var(--shape-full)",
						bgcolor: color,
						transition: `width ${SPRING}`,
						"@media (prefers-reduced-motion: reduce)": { transition: "none" },
					}}
				/>
			)}
			{value < 100 && (
				<Box
					sx={{
						position: "absolute",
						inset: "0 0 0 auto",
						left: value > 0 ? `calc(${filled} + ${GAP}px)` : 0,
						borderRadius: "var(--shape-full)",
						bgcolor: "var(--md-sys-color-surface-container-highest)",
						transition: `left ${SPRING}`,
						"@media (prefers-reduced-motion: reduce)": { transition: "none" },
						// the stop dot, in the filled colour, centred in the track's end
						"&::after": {
							content: '""',
							position: "absolute",
							top: "50%",
							right: 3,
							width: DOT,
							height: DOT,
							transform: "translateY(-50%)",
							borderRadius: "50%",
							bgcolor: color,
						},
					}}
				/>
			)}
			{tick !== undefined && (
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						top: -3,
						bottom: -3,
						left: `${tick}%`,
						width: 2,
						bgcolor: "text.primary",
						opacity: 0.6,
					}}
				/>
			)}
		</Box>
	);
}
