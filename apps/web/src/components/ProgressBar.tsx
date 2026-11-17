import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { waveMask } from "#/lib/wave";

/** The gap between the filled part and the track, and the stop dot at the track's end (M3 Expressive). */
const GAP = 3;
const DOT = 4;
const SPRING = "var(--spring-spatial-default-dur) var(--spring-spatial-default)";

/** The wave travels along the filled part: its mask slides one wavelength (`--wave-l`) per turn. */
const travel = keyframes`to { mask-position: var(--wave-l) 0; }`;

/** How far the wave swings beside the stroke (on each side), and how long a wavelength is, both in strokes. */
const AMPLITUDE = 0.5;
const WAVELENGTH = 4.5;

/**
 * A linear progress bar in the M3 Expressive style: a fully rounded filled part, a small gap, then
 * a fully rounded track that ends in a dot. Both ends spring when the value changes. `tick` marks a
 * target (a percentage) with a thin line across the bar. `wavy` draws the filled part as a
 * travelling wave on a thinner track, for a process under way; it flattens when it completes.
 */
export default function ProgressBar({
	percent,
	color,
	height = 8,
	tick,
	wavy = false,
	label,
	role = "progressbar",
	sx,
}: {
	/** 0 and up; anything past 100 reads as full */
	percent: number;
	/** Any colour `sx` accepts, such as `error.main` or a CSS variable */
	color: string;
	/** In px: one value, or one for phones and one from 600px up. For a wavy bar this is the stroke,
	 * and the bar is taller (`height` plus the swing of the wave). */
	height?: number | { xs: number; sm: number };
	tick?: number;
	/** A travelling wave in place of a flat bar */
	wavy?: boolean;
	label?: string;
	/** `img` for a bar that only draws a share and has no live value to announce */
	role?: "progressbar" | "img";
	sx?: SxProps<Theme>;
}) {
	const value = Math.max(0, Math.min(percent, 100));
	// a finished bar is flat, and so is one with nothing to wave yet
	const wave = wavy && value > 0 && value < 100;
	const stroke = typeof height === "number" ? height : height.sm;
	const waveHeight = stroke * (1 + 2 * AMPLITUDE);
	const waveLength = stroke * WAVELENGTH;
	const barHeight = wave
		? `${waveHeight}px`
		: typeof height === "number"
			? `${height}px`
			: { xs: `${height.xs}px`, sm: `${height.sm}px` };
	// the filled part never gets narrower than it is tall, so a small value still reads as a pill
	const filled = `max(${value}%, var(--bar-h))`;
	// the track sits in the middle of a wavy bar, thinner than the wave's stroke
	const trackHeight = wave ? Math.max(4, Math.round(stroke * 0.5)) : undefined;
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
						...(wave && {
							// the wave is the mask: the colour shows only where the stroke is
							"--wave-l": `${waveLength}px`,
							maskImage: waveMask(stroke, waveHeight, waveLength),
							maskRepeat: "repeat-x",
							maskSize: `${waveLength}px ${waveHeight}px`,
							maskPosition: "0 0",
							animation: `${travel} 1.4s linear infinite`,
						}),
						"@media (prefers-reduced-motion: reduce)": { transition: "none", animation: "none" },
					}}
				/>
			)}
			{value < 100 && (
				<Box
					sx={{
						position: "absolute",
						inset: "0 0 0 auto",
						left: value > 0 ? `calc(${filled} + ${GAP}px)` : 0,
						...(trackHeight !== undefined && {
							top: `calc(50% - ${trackHeight / 2}px)`,
							bottom: "auto",
							height: trackHeight,
						}),
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
