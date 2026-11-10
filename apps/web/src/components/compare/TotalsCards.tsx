import Box from "@mui/material/Box";
import Money from "#/components/Money";
import { memo } from "react";
import type { Totals } from "#/lib/compare";
import { formatMoney } from "#/lib/format";
import MetricCard from "../dashboard/MetricCard";
import DeltaChip from "./DeltaChip";

/** Income, spending and what was kept: the figure for the period being looked at, and how far it
 * moved from the one before. */
const TotalsCards = memo(function TotalsCards({
	totals,
	currency,
	against,
}: {
	totals: Totals;
	currency: string;
	against: string;
}) {
	const cards = [
		{ label: "Income", change: totals.income, goodWhenUp: true },
		{ label: "Spending", change: totals.expense, goodWhenUp: false },
		{ label: "Kept", change: totals.kept, goodWhenUp: true },
	];
	return (
		<Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "repeat(3, 1fr)" }, mb: 2 }}>
			{cards.map(({ label, change, goodWhenUp }) => (
				<MetricCard
					key={label}
					label={label}
					value={formatMoney(change.now, currency)}
					badge={
						<Box sx={{ display: "grid", gap: 0.75, justifyItems: "start" }}>
							<DeltaChip row={change} currency={currency} goodWhenUp={goodWhenUp} />
							<Box component="span" sx={{ fontSize: 13, color: "text.secondary" }}>
								<Money amount={change.before} currency={currency} /> in {against}
							</Box>
						</Box>
					}
				/>
			))}
		</Box>
	);
});

export default TotalsCards;
