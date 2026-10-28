import { memo, useMemo } from "react";
import { formatMoney } from "#/lib/format";
import { monthLabel } from "#/lib/dashboard";
import type { MonthlyStats } from "#/types/api";
import ChartCard from "../charts/ChartCard";
import ColumnPairs from "../charts/ColumnPairs";
import Legend from "../charts/Legend";

const INCOME = { name: "Income", color: "var(--chart-income)" };
const EXPENSE = { name: "Expenses", color: "var(--chart-expense)" };

/** Income against expenses for each of the last few months. */
const MonthlyCard = memo(function MonthlyCard({ stats }: { stats: MonthlyStats }) {
	const { currency, months } = stats;
	const groups = useMemo(
		() =>
			months.map((m) => ({
				label: monthLabel(`${m.month}-01`, true),
				title: monthLabel(`${m.month}-01`),
				a: Number(m.income),
				b: Number(m.expense),
			})),
		[months],
	);
	const table = useMemo(
		() => ({
			head: ["Month", "Income", "Expenses"],
			rows: months
				.toReversed()
				.map((m) => [
					monthLabel(`${m.month}-01`),
					formatMoney(m.income, currency),
					formatMoney(m.expense, currency),
				]),
		}),
		[months, currency],
	);

	return (
		<ChartCard
			title="Income and expenses"
			subtitle={`The last ${months.length} months`}
			legend={<Legend items={[INCOME, EXPENSE]} />}
			table={table}
		>
			<ColumnPairs
				groups={groups}
				series={[INCOME, EXPENSE]}
				formatValue={(v) => formatMoney(String(v), currency)}
				ariaLabel={`Income and expenses for each of the last ${months.length} months`}
			/>
		</ChartCard>
	);
});

export default MonthlyCard;
