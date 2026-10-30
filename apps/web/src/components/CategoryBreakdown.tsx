import { morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Reveal from "#/components/Reveal";
import { formatMoney } from "#/lib/format";
import { categoryAccent } from "#/lib/categories";
import { staggerChildren, useLastDefined } from "#/lib/motion";
import type { CategoryTotal, CategoryTotals } from "#/types/api";

const MAX_ROWS = 8;

function Section({
	title,
	rows,
	currency,
}: {
	title: string;
	rows: CategoryTotal[];
	currency: string;
}) {
	if (rows.length === 0) return null;
	const top = Number(rows[0].total) || 1;
	return (
		<Box sx={{ display: "grid", gap: 1.25, ...staggerChildren() }}>
			<Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
				{title}
			</Typography>
			{rows.slice(0, MAX_ROWS).map((row) => (
				<Box key={row.category}>
					<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
						<Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
							{row.category}
						</Typography>
						<Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
							{formatMoney(row.total, currency)}
						</Typography>
					</Box>
					<Box
						sx={{
							mt: 0.5,
							height: 6,
							borderRadius: "var(--shape-full)",
							bgcolor: "var(--md-sys-color-surface-container-highest)",
						}}
					>
						<Box
							sx={{
								height: "100%",
								width: `${Math.max(2, (Number(row.total) / top) * 100)}%`,
								borderRadius: "var(--shape-full)",
								bgcolor: categoryAccent(row.color),
								transition: "width var(--spring-spatial-default-dur) var(--spring-spatial-default)",
							}}
						/>
					</Box>
				</Box>
			))}
			{rows.length > MAX_ROWS && (
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					and {rows.length - MAX_ROWS} more in the export
				</Typography>
			)}
		</Box>
	);
}

/** Where the filtered money went, by category. A split purchase counts toward each of its items'
 * categories. Opens and closes with the totals, keeping its last numbers while it closes. */
export default function CategoryBreakdown({ categories }: { categories: CategoryTotals | null }) {
	const shown = useLastDefined(categories);
	const open = Boolean(categories && categories.categories.length > 0);
	const both = Boolean(
		shown?.categories.some((c) => c.type === "income") &&
		shown.categories.some((c) => c.type === "expense"),
	);

	return (
		<Reveal in={open}>
			{shown && (
				<Box
					sx={{
						mb: 2,
						p: 2.5,
						display: "grid",
						gap: 2.5,
						gridTemplateColumns: { xs: "1fr", md: both ? "1fr 1fr" : "1fr" },
						...morph("xl"),
						bgcolor: "var(--md-sys-color-surface-container-low)",
					}}
				>
					<Section
						title="Expense by category"
						rows={shown.categories.filter((c) => c.type === "expense")}
						currency={shown.currency}
					/>
					<Section
						title="Income by category"
						rows={shown.categories.filter((c) => c.type === "income")}
						currency={shown.currency}
					/>
				</Box>
			)}
		</Reveal>
	);
}
