import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatMoney } from "#/lib/format";
import type { RefundItem } from "#/lib/refund";

const leftText = (left: string, currency: string) =>
	Number(left) <= 0 ? "already refunded" : `${formatMoney(left, currency)} left`;

/** The items of a purchase with several categories: tick the ones being refunded and say how much of
 * each. Each item can be refunded only up to what is left of it. */
export default function RefundItems({
	items,
	currency,
	locked,
	onChange,
}: {
	items: RefundItem[];
	currency: string;
	/** Editing an existing refund: the items are fixed, only the amounts change. */
	locked: boolean;
	onChange: (items: RefundItem[]) => void;
}) {
	const change = (id: string, patch: Partial<RefundItem>) =>
		onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

	return (
		<Stack spacing={1.5}>
			{items.map((item) => {
				const nothingLeft = Number(item.left) <= 0;
				return (
					<Stack
						key={item.id}
						direction="row"
						spacing={1.5}
						sx={{ alignItems: "center", justifyContent: "space-between" }}
					>
						<FormControlLabel
							sx={{ m: 0, minWidth: 0, flex: 1 }}
							disabled={locked || nothingLeft}
							control={
								<Checkbox
									size="small"
									checked={item.on}
									onChange={(_, on) => change(item.id, { on })}
								/>
							}
							label={
								<div>
									<Typography variant="body2" sx={{ fontWeight: 500 }}>
										{item.name}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{item.category}
										{locked ? null : ` · ${leftText(item.left, currency)}`}
									</Typography>
								</div>
							}
						/>
						<TextField
							size="small"
							label="Refund"
							value={item.amount}
							disabled={!item.on}
							onChange={(e) => change(item.id, { amount: e.target.value })}
							slotProps={{
								htmlInput: { inputMode: "decimal", "aria-label": `Refund for ${item.name}` },
							}}
							sx={{ width: 130 }}
						/>
					</Stack>
				);
			})}
		</Stack>
	);
}
