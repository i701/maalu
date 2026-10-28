import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import { spendingRows } from "#/lib/dashboard";
import { formatMoney } from "#/lib/format";
import type { CategoryTotals } from "#/types/api";
import ChartCard from "../charts/ChartCard";
import HorizontalBars from "../charts/HorizontalBars";

/** Where the month's spending went: the biggest categories, the rest folded into "Other". */
const SpendingCard = memo(function SpendingCard({
	categories,
	period,
}: {
	categories: CategoryTotals;
	period: string;
}) {
	const { currency } = categories;
	const rows = useMemo(() => spendingRows(categories.categories), [categories.categories]);
	const table = useMemo(
		() => ({
			head: ["Category", "Spent", "Share"],
			rows: rows.map((r) => [
				r.name,
				formatMoney(String(r.total), currency),
				`${Math.round(r.share * 100)}%`,
			]),
		}),
		[rows, currency],
	);

	return (
		<ChartCard
			title="Spending by category"
			subtitle={period}
			table={rows.length > 0 ? table : undefined}
		>
			{rows.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 3 }}>
					No spending in this period yet.
				</Typography>
			) : (
				<HorizontalBars
					rows={rows.map((r) => ({ name: r.name, value: r.total, share: r.share }))}
					formatValue={(v) => formatMoney(String(v), currency)}
					color="var(--chart-expense)"
				/>
			)}
		</ChartCard>
	);
});

export default SpendingCard;
