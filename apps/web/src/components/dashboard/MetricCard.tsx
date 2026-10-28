import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** A single headline figure: a label, the value, and a change badge. A number, not a chart. */
export default function MetricCard({
	label,
	value,
	badge,
}: {
	label: string;
	value: string;
	badge?: ReactNode;
}) {
	return (
		<Box
			sx={{
				p: 2.5,
				minWidth: 0,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
				// On a narrow screen the label and value share a row, so three figures don't take a screen
				display: { xs: "grid", lg: "block" },
				gridTemplateColumns: "minmax(0, 1fr) auto",
				alignItems: "baseline",
				columnGap: 2,
			}}
		>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{label}
			</Typography>
			<Typography
				sx={{ fontSize: { xs: 22, lg: 28 }, fontWeight: 600, lineHeight: 1.25, mt: { lg: 0.5 } }}
			>
				{value}
			</Typography>
			{badge && <Box sx={{ mt: 1, gridColumn: "1 / -1" }}>{badge}</Box>}
		</Box>
	);
}
