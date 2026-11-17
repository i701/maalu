import Typography from "@mui/material/Typography";
import { type Control, Controller, useFormState } from "react-hook-form";
import Money from "#/components/Money";
import { formatMoney } from "#/lib/format";
import FormTextField from "./FormTextField";
import type { RefundFormInput, RefundFormOutput } from "./refund-form";
import RefundItems from "./RefundItems";

/** How much is being refunded: item by item for a purchase with items, otherwise one amount. */
export default function RefundAmount({
	control,
	total,
	currency,
	left,
	locked,
}: {
	control: Control<RefundFormInput, unknown, RefundFormOutput>;
	/** The ticked items' total, when there are items. */
	total: string | null;
	currency: string;
	/** What is left to refund, when it is known (a new refund). */
	left?: string;
	locked: boolean;
}) {
	const { errors } = useFormState({ control, name: "items" });
	if (total !== null) {
		return (
			<>
				<Controller
					name="items"
					control={control}
					render={({ field }) => (
						<RefundItems
							items={field.value}
							currency={currency}
							locked={locked}
							errors={Object.fromEntries(
								field.value.flatMap((item, i) => {
									const message = errors.items?.[i]?.amount?.message;
									return message ? [[item.id, message]] : [];
								}),
							)}
							onChange={field.onChange}
						/>
					)}
				/>
				<Typography variant="caption" sx={{ display: "block", color: "text.secondary", my: 1.5 }}>
					Refund total: <Money amount={total} currency={currency} />
				</Typography>
			</>
		);
	}
	return (
		<FormTextField
			control={control}
			name="amount"
			label="Amount refunded"
			required
			autoFocus
			helperText={left ? `Up to ${formatMoney(left, currency)} is left to refund` : undefined}
			slotProps={{ htmlInput: { inputMode: "decimal" } }}
			sx={{ mb: 2 }}
		/>
	);
}
