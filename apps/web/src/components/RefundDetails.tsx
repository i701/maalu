import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { formatTime, trimRate } from "#/lib/format";
import { localToday } from "#/lib/planned";
import type { Account, Transaction } from "#/types/api";

/** The rest of a refund: when, where the money went, the rate if it is foreign, and a note. */
export default function RefundDetails({
	refund,
	rate,
	currency,
	baseCurrency,
	accounts,
	accountId,
	onAccount,
}: {
	refund?: Transaction;
	/** The rate to start from: the purchase's, or the refund's own. */
	rate: string;
	currency: string;
	baseCurrency: string;
	/** Accounts in the refund's currency. */
	accounts: Account[];
	accountId: string;
	onAccount: (id: string) => void;
}) {
	return (
		<>
			<TextField
				label="Date"
				name="transaction_date"
				type="date"
				required
				defaultValue={refund?.transaction_date ?? localToday()}
				slotProps={{ inputLabel: { shrink: true } }}
				sx={{ mb: 2 }}
			/>
			<TextField
				label="Time"
				name="transaction_time"
				type="time"
				defaultValue={formatTime(refund?.transaction_time ?? null) ?? ""}
				slotProps={{ inputLabel: { shrink: true } }}
				sx={{ mb: 2 }}
			/>
			{accounts.length > 0 && (
				<TextField
					select
					label="Paid back into"
					value={accountId}
					onChange={(e) => onAccount(e.target.value)}
					helperText={`Accounts in ${currency}`}
					sx={{ mb: 2 }}
				>
					<MenuItem value="">No account</MenuItem>
					{accounts.map((a) => (
						<MenuItem key={a.id} value={a.id}>
							{a.name}
						</MenuItem>
					))}
				</TextField>
			)}
			{currency !== baseCurrency && (
				<TextField
					label="Rate"
					name="exchange_rate"
					required
					defaultValue={trimRate(rate)}
					helperText={`${baseCurrency} for 1 ${currency}. Starts as the purchase's rate; change it if the refund was converted differently`}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
					sx={{ mb: 2 }}
				/>
			)}
			<TextField
				label="Note"
				name="description"
				defaultValue={refund?.description ?? ""}
				multiline
				minRows={2}
			/>
		</>
	);
}
