import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { STATUS_COLOR, STATUS_LABEL, unsigned } from "#/lib/budget";
import { formatMoney } from "#/lib/format";
import type { Budget } from "#/types/api";
import TonalChip from "./TonalChip";

/** The whole budget at a glance: everything spent against every limit, what is left, and how many
 * lines need attention. A calm surface, so the figures are what you read. */
export default function BudgetSummary({ budget }: { budget: Budget }) {
	const { totals, currency, attention } = budget;
	const color = STATUS_COLOR[totals.status];
	const over = totals.status === "over";
	const width = Math.min(totals.percent, 100);

	return (
		<Box
			sx={{
				mb: 2,
				p: 2.5,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					gap: 2,
					flexWrap: "wrap",
				}}
			>
				<Box>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						Spent this period
					</Typography>
					<Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
						<Typography
							sx={{
								fontSize: 32,
								fontWeight: 600,
								fontVariantNumeric: "tabular-nums",
								lineHeight: 1.2,
							}}
						>
							{formatMoney(totals.activity, currency)}
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							of {formatMoney(totals.amount, currency)}
						</Typography>
					</Box>
				</Box>
				<Box sx={{ textAlign: { sm: "right" } }}>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{over ? "Over by" : "Left"}
					</Typography>
					<Typography
						sx={{
							fontSize: 22,
							fontWeight: 600,
							fontVariantNumeric: "tabular-nums",
							color: over ? color : "text.primary",
						}}
					>
						{formatMoney(over ? unsigned(totals.available) : totals.available, currency)}
					</Typography>
				</Box>
			</Box>
			<Box
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={width}
				sx={{
					mt: 2,
					height: 12,
					borderRadius: "var(--shape-full)",
					bgcolor: "var(--md-sys-color-surface-container-highest)",
					overflow: "hidden",
				}}
			>
				<Box
					sx={{
						height: "100%",
						width: `${width}%`,
						minWidth: width > 0 ? 12 : 0,
						borderRadius: "var(--shape-full)",
						bgcolor: color,
						transition: "width var(--spring-spatial-default-dur) var(--spring-spatial-default)",
					}}
				/>
			</Box>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
				<TonalChip accent={color} label={`${STATUS_LABEL[totals.status]} · ${totals.percent}%`} />
				{attention > 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{attention} {attention === 1 ? "limit needs" : "limits need"} attention
					</Typography>
				)}
			</Box>
		</Box>
	);
}
