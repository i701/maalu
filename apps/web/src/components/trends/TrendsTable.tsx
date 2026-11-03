import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo, useMemo } from "react";
import { formatMoney } from "#/lib/format";
import { cellText, columnTotals, heat, maxCell, monthColumn, monthlyAverage } from "#/lib/trends";
import type { CategoryMonthRow } from "#/types/api";
import CategoryDot from "../CategoryDot";

const nameOf = (r: CategoryMonthRow) => (r.parent ? `${r.parent} › ${r.category}` : r.category);

// The first column stays put while the months scroll under it.
const sticky = {
	position: "sticky",
	left: 0,
	zIndex: 1,
	bgcolor: "var(--md-sys-color-surface-container-low)",
	minWidth: 150,
	maxWidth: 220,
	whiteSpace: "nowrap",
} as const;

/**
 * A category-by-month table: one row per category, one column per month, then the total and the
 * monthly average. Each figure is shaded by its share of the biggest in the table (`--chart-expense`
 * or `--chart-income`), so a busy month stands out at a glance; the number is always there too, so
 * the shade is never the only signal. Wide on purpose: it scrolls sideways on a narrow screen with
 * the category names kept in view.
 */
const TrendsTable = memo(function TrendsTable({
	rows,
	months,
	currency,
	color,
	label,
}: {
	rows: CategoryMonthRow[];
	months: string[];
	currency: string;
	color: string;
	label: string;
}) {
	const max = useMemo(() => maxCell(rows), [rows]);
	const totals = useMemo(() => columnTotals(rows, months.length), [rows, months.length]);
	const grand = useMemo(
		() => totals.reduce((s, t) => (Number(s) + Number(t)).toFixed(4), "0"),
		[totals],
	);

	return (
		<TableContainer
			sx={{
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Table size="small" aria-label={label} sx={{ minWidth: 140 + months.length * 76 + 220 }}>
				<TableHead>
					<TableRow>
						<TableCell sx={sticky}>Category</TableCell>
						{months.map((m) => (
							<TableCell key={m} align="right" sx={{ whiteSpace: "nowrap" }}>
								{monthColumn(m)}
							</TableCell>
						))}
						<TableCell align="right" sx={{ fontWeight: 700 }}>
							Total
						</TableCell>
						<TableCell align="right">Per month</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((r) => (
						<TableRow key={`${r.type}-${r.category_id}`} hover>
							<TableCell sx={{ ...sticky, fontWeight: 500 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
									<CategoryDot color={r.color} />
									<Box
										component="span"
										title={nameOf(r)}
										sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
									>
										{nameOf(r)}
									</Box>
								</Box>
							</TableCell>
							{r.amounts.map((a, i) => {
								const share = heat(a, max);
								return (
									<TableCell
										key={months[i]}
										align="right"
										title={`${nameOf(r)}, ${monthColumn(months[i])}: ${formatMoney(a, currency)}`}
										sx={{
											fontVariantNumeric: "tabular-nums",
											color: Number(a) === 0 ? "text.disabled" : undefined,
											bgcolor:
												share > 0
													? `color-mix(in oklab, ${color} ${Math.round(8 + share * 52)}%, transparent)`
													: undefined,
										}}
									>
										{cellText(a)}
									</TableCell>
								);
							})}
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
								{cellText(r.total)}
							</TableCell>
							<TableCell
								align="right"
								sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}
							>
								{cellText(monthlyAverage(r))}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
				<TableFooter>
					<TableRow>
						<TableCell sx={{ ...sticky, fontWeight: 700 }}>All categories</TableCell>
						{totals.map((t, i) => (
							<TableCell
								key={months[i]}
								align="right"
								sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
							>
								{cellText(t)}
							</TableCell>
						))}
						<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
							{cellText(grand)}
						</TableCell>
						<TableCell
							align="right"
							sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}
						>
							{cellText((Number(grand) / Math.max(months.length, 1)).toFixed(2))}
						</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
		</TableContainer>
	);
});

export default TrendsTable;
