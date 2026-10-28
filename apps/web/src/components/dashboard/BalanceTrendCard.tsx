import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import type { BalanceTrend } from "#/types/api";
import AreaChart from "../charts/AreaChart";
import ChartCard from "../charts/ChartCard";
import DeltaBadge from "./DeltaBadge";
import { percentChange } from "#/lib/dashboard";

/** What the accounts are worth, as the dashboard's one hero figure, with its line over the period.
 * Each account is valued at its own current rate, so the line moves with transactions. */
const BalanceTrendCard = memo(function BalanceTrendCard({
	trend,
	against,
}: {
	trend: BalanceTrend;
	/** The name of the period the change is measured from, e.g. "1 Oct" */
	against: string;
}) {
	const { currency, points } = trend;
	const first = points[0];
	const last = points[points.length - 1];
	const chart = useMemo(
		() => points.map((p) => ({ label: formatDate(p.date), value: Number(p.total) })),
		[points],
	);
	const table = useMemo(
		() => ({
			head: ["Date", "Net worth", "Assets", "Debts"],
			rows: points
				.toReversed()
				.map((p) => [
					formatDate(p.date),
					formatMoney(p.total, currency),
					formatMoney(p.assets, currency),
					formatMoney(p.liabilities, currency),
				]),
		}),
		[points, currency],
	);
	if (!first || !last) return null;

	return (
		<ChartCard title="Net worth" subtitle="What your accounts are worth in total" table={table}>
			<Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
				{/* 28px on a wide screen, the same as the figure tiles (larger read as too big); scaled down so it still fits a phone */}
				<Typography sx={{ fontSize: "clamp(22px, 7vw, 28px)", fontWeight: 600, lineHeight: 1.1 }}>
					{formatMoney(last.total, currency)}
				</Typography>
				<DeltaBadge percent={percentChange(last.total, first.total)} goodWhenUp against={against} />
			</Box>
			<AreaChart
				points={chart}
				name="Net worth"
				formatValue={(v) => formatMoney(String(v), currency)}
				ariaLabel={`Net worth from ${chart[0].label} to ${chart[chart.length - 1].label}, ending at ${formatMoney(last.total, currency)}`}
			/>
			<Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
				Assets {formatMoney(last.assets, currency)} · Debts{" "}
				{formatMoney(last.liabilities, currency)}
			</Typography>
		</ChartCard>
	);
});

export default BalanceTrendCard;
