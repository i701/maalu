import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@emotion/react";
import type { ReactNode } from "react";
import { ACCENT, type Accent } from "#/lib/m3";
import { SPRING } from "#/lib/motion";
import ShapeTile from "./ShapeTile";
import Symbol from "./Symbol";

const rise = keyframes`from { transform: translateY(8px); } to { transform: none; }`;
const fade = keyframes`from { opacity: 0; } to { opacity: 1; }`;

/**
 * The message shown in place of an empty table: a big shaped icon, then the message (the demo's
 * empty state). `firstRun` is for "nothing exists yet" (a rare, first-time moment) and gives it a
 * gentle one-time entrance. Leave it off for "no results match these filters", which people see
 * constantly and which should just appear.
 */
export default function EmptyState({
	children,
	firstRun = false,
	symbol = "search",
	accent = "slate",
	shape = 0,
}: {
	children: ReactNode;
	firstRun?: boolean;
	/** Material Symbols name (must exist in the bundled font subset) */
	symbol?: string;
	accent?: Accent;
	shape?: number;
}) {
	return (
		<Box
			sx={{
				display: "grid",
				justifyItems: "center",
				gap: 2,
				textAlign: "center",
				py: 7,
				px: 2,
				...(firstRun && {
					animation: `${rise} ${SPRING.spatial} both, ${fade} ${SPRING.effects} both`,
					"@media (prefers-reduced-motion: reduce)": {
						animation: `${fade} ${SPRING.effects} both`,
					},
				}),
			}}
		>
			<ShapeTile shape={shape} size={80} accent={ACCENT[accent]}>
				<Symbol name={symbol} size={34} filled />
			</ShapeTile>
			<Typography variant="subtitle1" sx={{ maxWidth: 420, color: "text.secondary" }}>
				{children}
			</Typography>
		</Box>
	);
}
