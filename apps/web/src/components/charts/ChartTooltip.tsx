import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type TooltipRow = { label: string; value: string; color: string };

/** The readout beside a hovered or focused chart position: a title, then each series' value (the
 * value leads, the name follows) keyed by a short stroke of its colour. Positioned by the chart. */
export default function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
	return (
		<Box
			role="status"
			sx={{
				px: 1.5,
				py: 1,
				minWidth: 120,
				borderRadius: "var(--shape-sm)",
				bgcolor: "var(--md-sys-color-inverse-surface)",
				color: "var(--md-sys-color-inverse-on-surface)",
				boxShadow: "var(--elev-2)",
				pointerEvents: "none",
			}}
		>
			<Typography sx={{ fontSize: 12, opacity: 0.8 }}>{title}</Typography>
			{rows.map((row) => (
				<Box key={row.label} sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
					<Box sx={{ width: 10, height: 2, borderRadius: 1, bgcolor: row.color, flexShrink: 0 }} />
					<Typography sx={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
						{row.value}
					</Typography>
					<Typography sx={{ fontSize: 12, opacity: 0.8 }}>{row.label}</Typography>
				</Box>
			))}
		</Box>
	);
}
