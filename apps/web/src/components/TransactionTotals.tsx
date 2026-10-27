import Grid from "@mui/material/Grid";
import Reveal from "#/components/Reveal";
import StatCard from "#/components/StatCard";
import { formatMoney } from "#/lib/format";
import { staggerChildren, useLastDefined } from "#/lib/motion";
import type { TransactionTotals as Totals } from "#/types/api";

/** Income and expense of the filtered results. Opens and closes smoothly (instead of popping in
 * and shoving the table down), keeping its last numbers while it closes. */
export default function TransactionTotals({ totals }: { totals: Totals | null }) {
	const shown = useLastDefined(totals);

	return (
		<Reveal in={Boolean(totals)}>
			{shown && (
				<Grid container spacing={2} sx={{ pb: 2, ...staggerChildren() }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<StatCard
							label="Income in these results"
							value={formatMoney(shown.income, shown.currency)}
							gradient="emerald"
							icon="arrow_downward"
							shape={1}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<StatCard
							label="Expense in these results"
							value={formatMoney(shown.expense, shown.currency)}
							gradient="rose"
							icon="arrow_upward"
							shape={4}
						/>
					</Grid>
				</Grid>
			)}
		</Reveal>
	);
}
