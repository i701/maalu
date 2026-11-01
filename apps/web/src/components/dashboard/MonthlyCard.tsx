import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { memo, useMemo, useState } from "react";
import { lastMonths, netRows, RANGES, type Range } from "#/lib/cash-flow";
import { monthLabel } from "#/lib/dashboard";
import { formatMoney } from "#/lib/format";
import type { MonthlyStats } from "#/types/api";
import AreaChart from "../charts/AreaChart";
import ChartCard from "../charts/ChartCard";
import ColumnPairs from "../charts/ColumnPairs";
import Legend from "../charts/Legend";
import NetBars from "../charts/NetBars";

const INCOME = { name: "Income", color: "var(--chart-income)" };
const EXPENSE = { name: "Expenses", color: "var(--chart-expense)" };
const KEPT = { name: "Kept", color: "var(--chart-line)" };
const OVERSPENT = { name: "Overspent", color: "var(--chart-expense)" };

/** Cash flow over the last 6 or 12 months: income against expenses, and what was kept or
 * overspent each month (income less expenses). One range switch drives both. */
const MonthlyCard = memo(function MonthlyCard({ stats }: { stats: MonthlyStats }) {
	const { currency } = stats;
	const [range, setRange] = useState<Range>(6);
	const months = useMemo(() => lastMonths(stats.months, range), [stats.months, range]);
	const rows = useMemo(() => netRows(months), [months]);
	const groups = useMemo(
		() =>
			rows.map((r) => ({
				label: monthLabel(`${r.month}-01`, true),
				title: monthLabel(`${r.month}-01`),
				a: r.income,
				b: Math.max(0, r.expense), // refunds can take a month below zero
			})),
		[rows],
	);
	const netGroups = useMemo(
		() =>
			rows.map((r) => ({
				label: monthLabel(`${r.month}-01`, true),
				title: monthLabel(`${r.month}-01`),
				value: r.net,
				income: r.income,
				expense: r.expense,
			})),
		[rows],
	);
	const running = useMemo(
		() => rows.map((r) => ({ label: monthLabel(`${r.month}-01`), value: r.running })),
		[rows],
	);
	const table = useMemo(
		() => ({
			head: ["Month", "Income", "Expenses", "Kept", "Kept in total"],
			rows: rows
				.toReversed()
				.map((r) => [
					monthLabel(`${r.month}-01`),
					formatMoney(String(r.income), currency),
					formatMoney(String(r.expense), currency),
					formatMoney(r.netText, currency),
					formatMoney(r.runningText, currency),
				]),
		}),
		[rows, currency],
	);
	const format = (v: number) => formatMoney(String(v), currency);

	return (
		<ChartCard
			title="Cash flow"
			subtitle={`The last ${rows.length} months`}
			legend={
				<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
					<Legend items={[INCOME, EXPENSE]} />
					<ToggleButtonGroup
						exclusive
						size="small"
						value={range}
						onChange={(_, value: Range | null) => value && setRange(value)}
						aria-label="How many months to show"
					>
						{RANGES.map((r) => (
							<ToggleButton key={r} value={r} sx={{ px: 1.5, py: 0.25 }}>
								{r} months
							</ToggleButton>
						))}
					</ToggleButtonGroup>
				</Box>
			}
			table={table}
		>
			<ColumnPairs
				groups={groups}
				series={[INCOME, EXPENSE]}
				formatValue={format}
				ariaLabel={`Income and expenses for each of the last ${rows.length} months`}
			/>
			<Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1, mb: 1 }}>
				Kept each month
			</Typography>
			<Box sx={{ mb: 1 }}>
				<Legend items={[KEPT, OVERSPENT]} />
			</Box>
			<NetBars
				groups={netGroups}
				formatValue={format}
				keptColor={KEPT.color}
				overColor={OVERSPENT.color}
				ariaLabel={`Money kept or overspent in each of the last ${rows.length} months`}
			/>
			<Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1, mb: 1 }}>
				Kept in total
			</Typography>
			<AreaChart
				points={running}
				name="Kept in total"
				formatValue={format}
				ariaLabel={`Money kept in total over the last ${rows.length} months, ending at ${format(rows.at(-1)?.running ?? 0)}`}
				height={140}
			/>
		</ChartCard>
	);
});

export default MonthlyCard;
