import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import type { ComponentProps, ReactNode } from "react";
import { SPRING } from "#/lib/motion";
import Reveal from "../Reveal";

export type CellSize = ComponentProps<typeof Grid>["size"];

const cellIn = keyframes`from { transform: translateY(4px); } to { transform: none; }`;
const cellFade = keyframes`from { opacity: 0; } to { opacity: 1; }`;

/**
 * A form cell. Row spacing is padding inside the cell (the grid only spaces columns), so a cell
 * wrapped in <RevealCell> takes no space at all while hidden. `fadeIn` plays a short entrance when
 * the cell mounts, used when switching transaction type swaps the whole set of fields.
 */
export function Cell({
	size,
	fadeIn = false,
	children,
}: {
	size: CellSize;
	fadeIn?: boolean;
	children: ReactNode;
}) {
	return (
		<Grid
			size={size}
			sx={{
				pb: 2,
				...(fadeIn && {
					animation: `${cellIn} ${SPRING.spatialFast} both, ${cellFade} ${SPRING.effectsFast} both`,
					"@media (prefers-reduced-motion: reduce)": {
						animation: `${cellFade} ${SPRING.effectsFast} both`,
					},
				}),
			}}
		>
			{children}
		</Grid>
	);
}

/** A cell that opens and closes smoothly instead of popping in and shoving the form around. */
export function RevealCell({
	size,
	show,
	children,
}: {
	size: CellSize;
	show: boolean;
	children: ReactNode;
}) {
	return (
		<Grid size={size}>
			<Reveal in={show}>
				<Box sx={{ pb: 2 }}>{children}</Box>
			</Reveal>
		</Grid>
	);
}
