import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import type { FormEvent } from "react";
import { formatMoney } from "#/lib/format";
import { localToday } from "#/lib/planned";
import { useSheet } from "#/lib/sheet";
import { txTitle } from "#/lib/tx-display";
import { useAction } from "#/lib/use-action";
import { postTransactionFn } from "#/server/transactions";
import type { Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** "45.0000" as "45": the API sends four decimals, a person types fewer. */
const tidy = (amount: string) => (amount.includes(".") ? amount.replace(/\.?0+$/, "") : amount);

/** Turns a planned transaction into a real one. The bill is rarely exactly what was planned, so
 * the date (today) and the amount can be corrected on the way. */
export default function MarkPaidDialog({
	transaction,
	onClose,
}: {
	transaction: Transaction;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const ok = await run(() =>
			postTransactionFn({
				data: { id: transaction.id, transaction_date: text("date"), amount: text("amount") },
			}),
		);
		if (ok) {
			notify(`"${txTitle(transaction)}" marked as paid`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Mark as paid"
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Amount"
						name="amount"
						defaultValue={tidy(transaction.amount)}
						required
						autoFocus
						helperText={`Planned: ${formatMoney(transaction.amount, transaction.currency)}. Change it if the real amount differs`}
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={12}>
					<TextField
						label="Paid on"
						name="date"
						type="date"
						defaultValue={localToday()}
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
