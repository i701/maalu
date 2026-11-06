import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import {
	HISTORY_RANGES,
	RANGE_LABELS,
	historyPoints,
	historyRows,
	historySummary,
	type HistoryRange,
} from "#/lib/account-detail";
import { formatDate, formatMoney } from "#/lib/format";
import type { BalanceHistory } from "#/types/api";
import FilterChip from "../FilterChip";
import AreaChart from "../charts/AreaChart";
import ChartCard from "../charts/ChartCard";

/** What the account held at the end of each day, over 30 days, 90 days or a year, in its own
 * currency, with where it started, ended and how low and high it went. */
const AccountBalanceChart = memo(function AccountBalanceChart({
	history,
	days,
	onDays,
}: {
	history: BalanceHistory;
	days: HistoryRange;
	onDays: (days: HistoryRange) => void;
}) {
	const points = useMemo(() => historyPoints(history), [history]);
	const summary = useMemo(() => historySummary(history), [history]);
	const { currency } = history;
	const table = useMemo(
		() => ({
			head: ["Day", "Balance"],
			rows: historyRows(history).map((r) => [formatDate(r.date), formatMoney(r.balance, currency)]),
		}),
		[history, currency],
	);
	const money = (v: number) => formatMoney(v.toFixed(2), currency);
	if (!summary) return null;

	return (
		<Box sx={{ mb: 2 }}>
			<ChartCard
				title="Balance over time"
				subtitle={`At the end of each day, in ${currency}`}
				table={table}
			>
				<Box sx={{ display: "grid", gap: 1.5 }}>
					<Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
						{HISTORY_RANGES.map((d) => (
							<FilterChip
								key={d}
								label={RANGE_LABELS[d]}
								selected={d === days}
								onClick={() => onDays(d)}
							/>
						))}
					</Stack>
					<AreaChart
						points={points}
						name="Balance"
						formatValue={money}
						ariaLabel={`Balance over the last ${RANGE_LABELS[days]}, from ${money(summary.first)} to ${money(summary.last)}`}
						height={200}
					/>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						From {money(summary.first)} to {money(summary.last)} · Low {money(summary.low)} · High{" "}
						{money(summary.high)}
					</Typography>
				</Box>
			</ChartCard>
		</Box>
	);
});

export default AccountBalanceChart;
