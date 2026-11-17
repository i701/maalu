import MenuItem from "@mui/material/MenuItem";
import type { Control } from "react-hook-form";
import type { Account } from "#/types/api";
import FormTextField from "./FormTextField";
import type { RefundFormInput, RefundFormOutput } from "./refund-form";

/** The rest of a refund: when, where the money went, the rate if it is foreign, and a note. */
export default function RefundDetails({
	control,
	currency,
	baseCurrency,
	accounts,
}: {
	control: Control<RefundFormInput, unknown, RefundFormOutput>;
	currency: string;
	baseCurrency: string;
	/** Accounts in the refund's currency. */
	accounts: Account[];
}) {
	return (
		<>
			<FormTextField
				control={control}
				name="transaction_date"
				label="Date"
				type="date"
				required
				slotProps={{ inputLabel: { shrink: true } }}
				sx={{ mb: 2 }}
			/>
			<FormTextField
				control={control}
				name="transaction_time"
				label="Time"
				type="time"
				slotProps={{ inputLabel: { shrink: true } }}
				sx={{ mb: 2 }}
			/>
			{accounts.length > 0 && (
				<FormTextField
					control={control}
					name="account_id"
					select
					label="Paid back into"
					helperText={`Accounts in ${currency}`}
					sx={{ mb: 2 }}
				>
					<MenuItem value="">No account</MenuItem>
					{accounts.map((a) => (
						<MenuItem key={a.id} value={a.id}>
							{a.name}
						</MenuItem>
					))}
				</FormTextField>
			)}
			{currency !== baseCurrency && (
				<FormTextField
					control={control}
					name="exchange_rate"
					label="Rate"
					required
					helperText={`${baseCurrency} for 1 ${currency}. Starts as the purchase's rate; change it if the refund was converted differently`}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
					sx={{ mb: 2 }}
				/>
			)}
			<FormTextField control={control} name="description" label="Note" multiline minRows={2} />
		</>
	);
}
