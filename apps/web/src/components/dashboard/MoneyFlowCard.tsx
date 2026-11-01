import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import { compact } from "#/lib/charts";
import { formatMoney } from "#/lib/format";
import { moneyFlow } from "#/lib/money-flow";
import type { CategoryTotals } from "#/types/api";
import ChartCard from "../charts/ChartCard";
import Sankey from "../charts/Sankey";

/** Where the period's money came from and where it went: income categories into the total, out to
 * spending categories and what was saved (or, when more went out than came in, the gap). */
const MoneyFlowCard = memo(function MoneyFlowCard({
	categories,
	period,
}: {
	categories: CategoryTotals;
	period: string;
}) {
	const { currency } = categories;
	const flow = useMemo(() => moneyFlow(categories.categories), [categories.categories]);
	const table = useMemo(() => {
		if (!flow) return undefined;
		const name = new Map(flow.nodes.map((n) => [n.id, n.label]));
		const total = flow.nodes.find((n) => n.kind === "total")?.value ?? 1;
		return {
			head: ["Flow", "Amount", "Share"],
			rows: flow.links.map((l) => [
				`${name.get(l.source)} → ${name.get(l.target)}`,
				formatMoney(String(l.value), currency),
				`${Math.round((l.value / total) * 100)}%`,
			]),
		};
	}, [flow, currency]);

	return (
		<ChartCard title="Money flow" subtitle={period} table={table}>
			{flow === null ? (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 3 }}>
					No money in or out in this period yet.
				</Typography>
			) : (
				<Sankey
					flow={flow}
					formatValue={(v) => formatMoney(String(v), currency)}
					formatLabel={(v) =>
						v >= 1000 ? `${currency} ${compact(v)}` : formatMoney(String(v), currency)
					}
					ariaLabel={`Money flow in ${period}`}
				/>
			)}
		</ChartCard>
	);
});

export default MoneyFlowCard;
