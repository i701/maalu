import Typography from "@mui/material/Typography";
import { keyframes } from "@emotion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "#/lib/motion";

const rise = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; }`;
const fade = keyframes`from { opacity: 0; } to { opacity: 1; }`;

/**
 * The message shown in place of an empty table. `firstRun` is for "nothing exists yet" (a rare,
 * first-time moment) and gives it a gentle one-time entrance. Leave it off for "no results match
 * these filters", which people see constantly and which should just appear.
 */
export default function EmptyState({
	children,
	firstRun = false,
}: {
	children: ReactNode;
	firstRun?: boolean;
}) {
	return (
		<Typography
			sx={{
				textAlign: "center",
				py: 8,
				px: 2,
				color: "text.secondary",
				...(firstRun && {
					animation: `${rise} 300ms ${EASE_OUT} both`,
					"@media (prefers-reduced-motion: reduce)": {
						animation: `${fade} 120ms ${EASE_OUT} both`,
					},
				}),
			}}
		>
			{children}
		</Typography>
	);
}
