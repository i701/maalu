import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Reveal from "#/components/Reveal";
import StatCard from "#/components/StatCard";
import { formatMoney } from "#/lib/format";
import { GRADIENT } from "#/lib/m3";
import { staggerChildren, useLastDefined } from "#/lib/motion";
import { useCardMorph } from "#/lib/card-morph";
import type { TransactionTotals as Totals } from "#/types/api";

/** Income and expense of the filtered results. Opens and closes smoothly (instead of popping in
 * and shoving the table down), keeping its last numbers while it closes. */
export default function TransactionTotals({
	totals,
	note,
}: {
	totals: Totals | null;
	/** A line under the cards, for example that excluded accounts are not counted. */
	note?: string;
}) {
	const cardMorph = useCardMorph();
	const shown = useLastDefined(totals);

	return (
		<Reveal in={Boolean(totals)}>
			{shown && (
				<Grid container spacing={2} sx={{ pb: 2, ...staggerChildren() }}>
					{/* On a phone the two tiles are one slim strip, green for money in and red for money
					    out; the tiles are for wider screens. */}
					<Grid size={12} sx={{ display: { xs: "block", sm: "none" } }}>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								overflow: "hidden",
								color: "#fff",
								// one blend from green (money in) through a deep middle to red (money out)
								background: `linear-gradient(90deg, ${GRADIENT.emerald[0]} 0%, ${GRADIENT.emerald[1]} 40%, ${GRADIENT.rose[1]} 60%, ${GRADIENT.rose[0]} 100%)`,
								// a little narrower than the page, so it sits in from both edges
								mx: 2,
								...cardMorph,
							}}
						>
							{[
								{ label: "Income", value: shown.income, align: "left" },
								{
									label: Number(shown.refunded) > 0 ? "Expense, after refunds" : "Expense",
									value: shown.expense,
									align: "right",
								},
							].map((part) => (
								<Box
									key={part.label}
									sx={{
										px: 2,
										py: 1.25,
										minWidth: 0,
										// money in on the left, money out on the right
										textAlign: part.align as "left" | "right",
									}}
								>
									<Typography
										variant="caption"
										sx={{ display: "block", color: "rgb(255 255 255 / 0.78)" }}
									>
										{part.label}
									</Typography>
									<Typography
										sx={{
											fontSize: 15,
											fontWeight: 600,
											lineHeight: 1.3,
											fontVariantNumeric: "tabular-nums",
											overflowWrap: "anywhere",
										}}
									>
										{formatMoney(part.value, shown.currency)}
									</Typography>
								</Box>
							))}
						</Box>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }} sx={{ display: { xs: "none", sm: "block" } }}>
						<StatCard
							label="Income in these results"
							value={formatMoney(shown.income, shown.currency)}
							gradient="emerald"
							icon="arrow_downward"
							shape={1}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }} sx={{ display: { xs: "none", sm: "block" } }}>
						<StatCard
							label={
								Number(shown.refunded) > 0
									? "Expense in these results, after refunds"
									: "Expense in these results"
							}
							value={formatMoney(shown.expense, shown.currency)}
							gradient="rose"
							icon="arrow_upward"
							shape={4}
						/>
					</Grid>
					{note && (
						<Grid size={12}>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{note}
							</Typography>
						</Grid>
					)}
				</Grid>
			)}
		</Reveal>
	);
}
