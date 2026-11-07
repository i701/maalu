import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import {
	formatPercent,
	STATUS_TEXT,
	targetText,
	type IncomeRule as Rule,
	type RuleRow,
	type RuleStatus,
} from "#/lib/budget-rule";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { KIND_COLOR } from "#/lib/needs-wants";
import TonalChip from "../TonalChip";

const STATUS_ACCENT: Record<RuleStatus, string> = {
	on: ACCENT.green,
	over: ACCENT.orange,
	below: ACCENT.orange,
};

const BAR_COLOR = {
	need: KIND_COLOR.need,
	want: KIND_COLOR.want,
	save: "var(--chart-income)",
} as const;

/** One line of the rule: a bar of the share of income with a tick at the target, the figures, and
 * the status in words (never colour alone). */
function RuleLine({ row, currency }: { row: RuleRow; currency: string }) {
	const width = Math.max(0, Math.min(row.percent, 100));
	return (
		<Box sx={{ display: "grid", gap: 0.5 }}>
			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
				<Typography sx={{ fontSize: 14, fontWeight: 500 }}>
					{row.label}
					<Typography component="span" sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}>
						{targetText(row.key)}
					</Typography>
				</Typography>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
						{formatMoney(row.amount, currency)}
						<Typography component="span" sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}>
							{formatPercent(row.percent)} of income
						</Typography>
					</Typography>
					<TonalChip accent={STATUS_ACCENT[row.status]} label={STATUS_TEXT[row.status]} />
				</Box>
			</Box>
			<Box
				role="img"
				aria-label={`${row.label}: ${formatPercent(row.percent)} of income, target ${targetText(row.key).toLowerCase()}`}
				sx={{
					position: "relative",
					height: 10,
					borderRadius: "var(--shape-full)",
					bgcolor: "var(--md-sys-color-surface-container-highest)",
				}}
			>
				<Box
					sx={{
						height: "100%",
						width: `${width}%`,
						minWidth: width > 0 ? 6 : 0,
						borderRadius: "var(--shape-full)",
						bgcolor: BAR_COLOR[row.key],
					}}
				/>
				{/* the target, as a thin tick across the track */}
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						top: -3,
						bottom: -3,
						left: `${row.target}%`,
						width: 2,
						bgcolor: "text.primary",
						opacity: 0.6,
					}}
				/>
			</Box>
		</Box>
	);
}

/** Needs, wants and what was kept against the 50/30/20 rule of the period's income. */
const IncomeRule = memo(function IncomeRule({ rule, currency }: { rule: Rule; currency: string }) {
	return (
		<Box
			sx={{
				display: "grid",
				gap: 1.5,
				pt: 2,
				borderTop: "1px solid var(--md-sys-color-outline-variant)",
			}}
		>
			<Box>
				<Typography sx={{ fontSize: 14, fontWeight: 600 }}>
					Against 50/30/20 of your income
				</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					Income {formatMoney(rule.income, currency)}. Kept is what is left after all spending. The
					tick marks each target.
				</Typography>
			</Box>
			{rule.rows.map((row) => (
				<RuleLine key={row.key} row={row} currency={currency} />
			))}
			{rule.unsorted && (
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{formatMoney(rule.unsorted.amount, currency)} ({formatPercent(rule.unsorted.percent)} of
					income) is in categories not sorted into a need or a want. It lowers what was kept but
					counts toward neither target.
				</Typography>
			)}
		</Box>
	);
});

export default IncomeRule;
