import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Reveal from "#/components/Reveal";
import { formatMoney } from "#/lib/format";
import { useLastDefined } from "#/lib/motion";
import type { TransactionTotals as Totals } from "#/types/api";

function TotalCard({ label, amount, color }: { label: string; amount: string; color: string }) {
	return (
		<Grid size={{ xs: 12, sm: 6 }}>
			<Card>
				<CardContent>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{label}
					</Typography>
					<Typography variant="h2" component="p" sx={{ mt: 0.5, color }}>
						{amount}
					</Typography>
				</CardContent>
			</Card>
		</Grid>
	);
}

/** Income and expense of the filtered results. Opens and closes smoothly (instead of popping in
 * and shoving the table down), keeping its last numbers while it closes. */
export default function TransactionTotals({ totals }: { totals: Totals | null }) {
	const shown = useLastDefined(totals);

	return (
		<Reveal in={Boolean(totals)}>
			{shown && (
				<Grid container spacing={2} sx={{ pb: 2 }}>
					<TotalCard
						label="Income in these results"
						amount={formatMoney(shown.income, shown.currency)}
						color="success.main"
					/>
					<TotalCard
						label="Expense in these results"
						amount={formatMoney(shown.expense, shown.currency)}
						color="error.main"
					/>
				</Grid>
			)}
		</Reveal>
	);
}
