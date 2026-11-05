import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { memo, useMemo } from "react";
import { formatMoney } from "#/lib/format";
import { KIND_COLOR, KIND_NAMES, kindShares } from "#/lib/needs-wants";
import type { CategoryTotals } from "#/types/api";
import ChartCard from "../charts/ChartCard";

/** How much of the period's spending was needed, how much was wanted, and how much is not sorted
 * yet: one bar of the three and a line each, with a nudge to sort the rest. */
const NeedsWantsCard = memo(function NeedsWantsCard({
	categories,
	period,
}: {
	categories: CategoryTotals;
	period: string;
}) {
	const { currency } = categories;
	const rows = useMemo(() => kindShares(categories.categories), [categories.categories]);
	const table = useMemo(
		() =>
			rows
				? {
						head: ["Kind", "Spent", "Share"],
						rows: rows.map((r) => [
							KIND_NAMES[r.kind],
							formatMoney(r.total, currency),
							`${Math.round(r.share * 100)}%`,
						]),
					}
				: undefined,
		[rows, currency],
	);
	const unsorted = rows?.find((r) => r.kind === "unsorted");

	return (
		<ChartCard title="Needs and wants" subtitle={period} table={table}>
			{rows === null ? (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 3 }}>
					No spending in this period yet.
				</Typography>
			) : (
				<Box sx={{ display: "grid", gap: 2 }}>
					<Box
						role="img"
						aria-label={rows
							.map((r) => `${KIND_NAMES[r.kind]} ${Math.round(r.share * 100)}%`)
							.join(", ")}
						sx={{ display: "flex", gap: "2px", height: 12 }}
					>
						{rows
							.filter((r) => r.share > 0)
							.map((r) => (
								<Box
									key={r.kind}
									sx={{
										flex: r.share,
										minWidth: 4,
										bgcolor: KIND_COLOR[r.kind],
										borderRadius: "var(--shape-xs)",
									}}
								/>
							))}
					</Box>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 2, sm: 5 } }}>
						{rows.map((r) => (
							<Box key={r.kind} sx={{ minWidth: 0 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										aria-hidden
										sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: KIND_COLOR[r.kind] }}
									/>
									<Typography sx={{ fontSize: 14, fontWeight: 500 }}>
										{KIND_NAMES[r.kind]}
									</Typography>
								</Box>
								<Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
									{formatMoney(r.total, currency)}
									<Typography
										component="span"
										sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}
									>
										{Math.round(r.share * 100)}%
									</Typography>
								</Typography>
							</Box>
						))}
					</Box>
					{unsorted && unsorted.share > 0 && (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{Math.round(unsorted.share * 100)}% of this spending isn't sorted yet.{" "}
							<Link to="/categories" search={{ page: 1, pageSize: 20 }}>
								Sort your categories
							</Link>
						</Typography>
					)}
				</Box>
			)}
		</ChartCard>
	);
});

export default NeedsWantsCard;
