import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import Money from "#/components/Money";
import type { CategorySpend } from "#/lib/categories";
import type { Category } from "#/types/api";

/** What a category spent in the month shown, linking to those transactions (a parent's includes its
 * sub-categories', as the transaction filter does). Nothing spent is a dash. */
export default function CategorySpent({
	category,
	spend,
	currency,
	range,
}: {
	category: Category;
	spend: CategorySpend | undefined;
	currency: string;
	/** The month's first and last day */
	range: { start: string; end: string };
}) {
	if (!spend || Number(spend.withChildren) === 0)
		return (
			<Typography variant="body2" sx={{ color: "text.secondary" }} aria-label="Nothing spent">
				–
			</Typography>
		);
	return (
		<Link
			to="/transactions"
			search={{
				category_id: category.id,
				date_from: range.start,
				date_to: range.end,
				page: 1,
				pageSize: 20,
			}}
			style={{ color: "inherit", textDecoration: "none" }}
		>
			<Box sx={{ textAlign: "right" }}>
				<Typography variant="body2" sx={{ fontWeight: 600 }}>
					<Money amount={spend.withChildren} currency={currency} />
				</Typography>
				{spend.fromChildren && (
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						with sub-categories
					</Typography>
				)}
			</Box>
		</Link>
	);
}
