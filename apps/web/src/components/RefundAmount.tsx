import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatMoney } from "#/lib/format";
import type { RefundItem } from "#/lib/refund";
import RefundItems from "./RefundItems";

/** How much is being refunded: item by item for a purchase with items, otherwise one amount. */
export default function RefundAmount({
	items,
	total,
	currency,
	defaultAmount,
	left,
	locked,
	onItems,
}: {
	/** The items to pick from; empty for a purchase without items. */
	items: RefundItem[];
	/** The ticked items' total, when there are items. */
	total: string | null;
	currency: string;
	defaultAmount: string;
	/** What is left to refund, when it is known (a new refund). */
	left?: string;
	locked: boolean;
	onItems: (items: RefundItem[]) => void;
}) {
	if (total !== null) {
		return (
			<>
				<RefundItems items={items} currency={currency} locked={locked} onChange={onItems} />
				<Typography variant="caption" sx={{ display: "block", color: "text.secondary", my: 1.5 }}>
					Refund total: {formatMoney(total, currency)}
				</Typography>
			</>
		);
	}
	return (
		<TextField
			label="Amount refunded"
			name="amount"
			required
			autoFocus
			defaultValue={defaultAmount}
			helperText={left ? `Up to ${formatMoney(left, currency)} is left to refund` : undefined}
			slotProps={{ htmlInput: { inputMode: "decimal" } }}
			sx={{ mb: 2 }}
		/>
	);
}
