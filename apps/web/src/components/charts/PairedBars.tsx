import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type PairedRow = { name: string; before: number; now: number };

/**
 * Two bars per row on one scale: what it was before in a muted tone and what it is now in the
 * series colour, so the gap between them is the change. The names carry the identity, the two
 * values sit at the right in text colours (a legend above says which bar is which).
 */
export default function PairedBars({
	rows,
	formatValue,
	beforeColor,
	nowColor,
	beforeName,
	nowName,
}: {
	rows: PairedRow[];
	formatValue: (value: number) => string;
	beforeColor: string;
	nowColor: string;
	beforeName: string;
	nowName: string;
}) {
	const max = Math.max(...rows.flatMap((r) => [r.before, r.now]), 1);
	const bar = (value: number, color: string) => (
		<Box
			sx={{
				height: 8,
				borderRadius: "0 4px 4px 0",
				width: `${(Math.max(value, 0) / max) * 100}%`,
				minWidth: value > 0 ? 4 : 0,
				bgcolor: color,
				transition: "width var(--spring-spatial-default-dur) var(--spring-spatial-default)",
			}}
		/>
	);
	return (
		<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2 }}>
			{rows.map((row) => (
				<Box
					component="li"
					key={row.name}
					tabIndex={0}
					title={`${row.name}: ${formatValue(row.now)} ${nowName}, ${formatValue(row.before)} ${beforeName}`}
					sx={{ outlineOffset: 3, borderRadius: "var(--shape-xs)" }}
				>
					<Typography noWrap sx={{ fontSize: 14, fontWeight: 500, mb: 0.5 }}>
						{row.name}
					</Typography>
					<Box sx={{ display: "grid", gap: 0.5 }}>
						{[
							{ value: row.now, color: nowColor, name: nowName },
							{ value: row.before, color: beforeColor, name: beforeName },
						].map((b) => (
							<Box key={b.name} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
								<Box sx={{ flex: 1, minWidth: 0 }}>{bar(b.value, b.color)}</Box>
								<Typography
									sx={{
										fontSize: 12,
										fontVariantNumeric: "tabular-nums",
										color: "text.secondary",
										minWidth: 84,
										textAlign: "right",
									}}
								>
									{formatValue(b.value)}
								</Typography>
							</Box>
						))}
					</Box>
				</Box>
			))}
		</Box>
	);
}
