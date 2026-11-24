import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Donut from "#/components/charts/Donut";
import { STATUS_LABEL } from "#/lib/budget";
import { formatDate, formatMoney, sumDecimals } from "#/lib/format";
import type { BudgetLine } from "#/types/api";

/** How much of a limit is used, as a donut in the limit's colour with the percentage in the middle
 * (the colour comes from the caller: its own hue, red when close or over). A limit covers several
 * categories, so this is the limit's figure, named in the tooltip, not the category's own. The
 * ring stops at full; the number keeps counting past 100. */
export default function LimitRing({
	limit,
	color,
	currency,
	period,
}: {
	limit: BudgetLine;
	color: string;
	currency: string;
	/** The budget period the figure is for, given only when it is not the calendar month shown next to it */
	period?: { start: string; end: string };
}) {
	const spent = formatMoney(limit.activity, currency);
	const total = formatMoney(
		sumDecimals([limit.amount, limit.carried, limit.moved_in, `-${limit.moved_out}`]),
		currency,
	);
	const when = period ? ` (${formatDate(period.start)} to ${formatDate(period.end)})` : "";
	const description = `${limit.name} limit${when}: ${spent} of ${total} (${limit.percent}%), ${STATUS_LABEL[limit.status].toLowerCase()}`;
	return (
		<Tooltip title={description} arrow>
			<Box role="img" aria-label={description} tabIndex={0} sx={{ display: "inline-flex", color }}>
				<Donut share={limit.percent / 100} size={48} thickness={9}>
					<Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1, color: "text.primary" }}>
						{limit.percent}%
					</Typography>
				</Donut>
			</Box>
		</Tooltip>
	);
}
