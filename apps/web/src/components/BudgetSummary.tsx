import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { budgetByKind, STATUS_COLOR, STATUS_LABEL, unsigned } from "#/lib/budget";
import { KIND_COLOR, KIND_NAMES } from "#/lib/needs-wants";
import { formatMoney } from "#/lib/format";
import type { Budget } from "#/types/api";
import TonalChip from "./TonalChip";

/** The whole budget at a glance: everything spent against every limit, what is left, and how many
 * lines need attention. A calm surface, so the figures are what you read. */
/** Needs, wants and the limits that are neither, each with what was spent against what it allows. */
function KindSplit({ budget }: { budget: Budget }) {
	const kinds = budgetByKind(budget);
	if (kinds.length === 0) return null;
	return (
		<Box
			sx={{
				// side by side as columns, wrapping to fewer per row (down to one) only when a column
				// would be narrower than its basis, so a very small screen stacks them
				display: "flex",
				flexWrap: "wrap",
				gap: 1.5,
				mt: { xs: 1.25, sm: 2 },
			}}
		>
			{kinds.map((k) => (
				<Box
					key={k.kind}
					sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: "1 1 96px" }}
				>
					<Box
						aria-hidden
						sx={{
							width: 10,
							height: 10,
							flexShrink: 0,
							borderRadius: "var(--shape-full)",
							bgcolor: KIND_COLOR[k.kind],
						}}
					/>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
							{k.kind === "unsorted" ? "Other limits" : KIND_NAMES[k.kind]}
						</Typography>
						<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{formatMoney(k.spent, budget.currency)} of {formatMoney(k.limit, budget.currency)}
						</Typography>
					</Box>
				</Box>
			))}
		</Box>
	);
}

export default function BudgetSummary({ budget }: { budget: Budget }) {
	const { totals, currency, attention } = budget;
	const color = STATUS_COLOR[totals.status];
	const over = totals.status === "over";
	const width = Math.min(totals.percent, 100);

	return (
		<Box
			sx={{
				mb: { xs: 1, sm: 2 },
				p: { xs: 1.5, sm: 2.5 },
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
								fontSize: { xs: 24, sm: 32 },
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
							fontSize: { xs: 18, sm: 22 },
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
					mt: { xs: 1, sm: 2 },
					height: { xs: 8, sm: 12 },
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
			<KindSplit budget={budget} />
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1,
					mt: { xs: 1, sm: 1.5 },
					flexWrap: "wrap",
				}}
			>
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
