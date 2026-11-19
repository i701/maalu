import { useCardMorph } from "#/lib/card-morph";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Figure from "#/components/Figure";
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
	const cardMorph = useCardMorph();
	return (
		<Box
			sx={{
				// snug on a phone, roomier on a wide screen
				px: { xs: 2, lg: 2.5 },
				py: { xs: 1.25, lg: 2.5 },
				minWidth: 0,
				...cardMorph,
				bgcolor: "var(--md-sys-color-surface-container-low)",
				// the label (and the change badge under it) on the left, the figure big on the right
				display: "grid",
				gridTemplateColumns: "minmax(0, 1fr) auto",
				gridTemplateAreas: { xs: '"label value" "badge badge"', lg: '"label value" "badge value"' },
				alignItems: "center",
				columnGap: 2,
			}}
		>
			<Typography variant="body2" sx={{ color: "text.secondary", gridArea: "label" }}>
				{label}
			</Typography>
			<Typography
				sx={{
					gridArea: "value",
					textAlign: "right",
					fontSize: { xs: 24, lg: 36 },
					lineHeight: 1.1,
					"--figure-weight": 600,
				}}
			>
				<Figure>{value}</Figure>
			</Typography>
			{badge && <Box sx={{ mt: 1, gridArea: "badge" }}>{badge}</Box>}
		</Box>
	);
}
