import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type BarRow = { name: string; value: number; share: number };

/**
 * Ranked bars for comparing magnitudes (spending by category): one colour for every bar, since the
 * categories have no colour of their own, with the name on the left and the value at the bar's tip.
 * Bars are 8px thick with a rounded tip and a square base on one baseline.
 */
export default function HorizontalBars({
	rows,
	formatValue,
	color,
}: {
	rows: BarRow[];
	formatValue: (value: number) => string;
	color: string;
}) {
	const max = Math.max(...rows.map((r) => r.value), 1);
	return (
		<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.75 }}>
			{rows.map((row) => (
				<Box
					component="li"
					key={row.name}
					tabIndex={0}
					title={`${row.name}: ${formatValue(row.value)} (${Math.round(row.share * 100)}%)`}
					sx={{ outlineOffset: 3, borderRadius: "var(--shape-xs)" }}
				>
					<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
						<Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
							{row.name}
						</Typography>
						<Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
							{formatValue(row.value)}
							<Typography component="span" sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}>
								{Math.round(row.share * 100)}%
							</Typography>
						</Typography>
					</Box>
					<Box
						sx={{
							mt: 0.75,
							height: 8,
							borderRadius: "0 4px 4px 0",
							width: `${(row.value / max) * 100}%`,
							minWidth: 4,
							bgcolor: color,
							transition: "width var(--spring-spatial-default-dur) var(--spring-spatial-default)",
						}}
					/>
				</Box>
			))}
		</Box>
	);
}
