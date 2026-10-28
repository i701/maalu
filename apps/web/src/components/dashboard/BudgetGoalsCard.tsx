import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { describeLine, linesNeedingAttention, STATUS_COLOR, STATUS_LABEL } from "#/lib/budget";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import type { Budget, Goal } from "#/types/api";
import { RouterButton } from "../RouterLinks";
import TonalChip from "../TonalChip";

function Meter({ percent, color, label }: { percent: number; color: string; label: string }) {
	const width = Math.min(percent, 100);
	return (
		<Box
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={width}
			sx={{
				mt: 0.75,
				height: 8,
				borderRadius: "var(--shape-full)",
				bgcolor: "var(--md-sys-color-surface-container-highest)",
				overflow: "hidden",
			}}
		>
			<Box
				sx={{
					height: "100%",
					width: `${width}%`,
					minWidth: width > 0 ? 8 : 0,
					borderRadius: "var(--shape-full)",
					bgcolor: color,
				}}
			/>
		</Box>
	);
}

/** The budget at a glance (everything spent against the limits, and which limits need attention)
 * and the savings goals, each with a link to the page that manages it. */
const BudgetGoalsCard = memo(function BudgetGoalsCard({
	budget,
	goals,
}: {
	budget: Budget | null;
	goals: Goal[];
}) {
	const lines = budget && budget.lines.length > 0 ? budget : null;
	const attention = lines ? linesNeedingAttention(lines).slice(0, 3) : [];

	return (
		<Box
			sx={{
				p: 2.5,
				minWidth: 0,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Budget and goals
				</Typography>
				<RouterButton to="/budget" search={{ on: undefined }} color="inherit" size="small">
					Open
				</RouterButton>
			</Box>

			{lines ? (
				<Box sx={{ mb: 2 }}>
					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							gap: 1,
							alignItems: "baseline",
						}}
					>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Spent this period
						</Typography>
						<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{formatMoney(lines.totals.activity, lines.currency)} of{" "}
							{formatMoney(lines.totals.amount, lines.currency)}
						</Typography>
					</Box>
					<Meter
						percent={lines.totals.percent}
						color={STATUS_COLOR[lines.totals.status]}
						label="Spent against all limits"
					/>
					<Box sx={{ mt: 1, display: "grid", gap: 0.5 }}>
						{attention.length === 0 ? (
							<TonalChip accent={ACCENT.green} label={`${STATUS_LABEL.ok}: every limit is fine`} />
						) : (
							attention.map((l) => (
								<Typography
									key={l.id}
									variant="body2"
									sx={{ color: l.status === "over" ? "error.main" : "text.primary" }}
								>
									{describeLine(l, lines.currency)}
								</Typography>
							))
						)}
					</Box>
				</Box>
			) : (
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
					No budget limits yet. Set one for a category to be warned before you overspend.
				</Typography>
			)}

			{goals.length > 0 && (
				<Box sx={{ display: "grid", gap: 1.5 }}>
					{goals.slice(0, 3).map((g) => (
						<Box key={g.id}>
							<Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
								<Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
									{g.name}
								</Typography>
								<Typography
									variant="body2"
									sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
								>
									{g.percent}%
								</Typography>
							</Box>
							<Meter
								percent={g.percent}
								color={g.reached ? ACCENT.green : "var(--chart-line)"}
								label={`${g.name} progress`}
							/>
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
});

export default BudgetGoalsCard;
