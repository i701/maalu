import Alert from "@mui/material/Alert";
import Money from "#/components/Money";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { linkTransferFn } from "#/server/transactions";
import type { Transaction } from "#/types/api";
import { useNotify } from "./Notify";

/** Confirms turning two selected transactions, the two sides of one move of your own money, into
 * one transfer. The expense stays (as the transfer) and the income goes to the trash. */
export default function MakeTransferDialog({
	expense,
	income,
	onClose,
	onDone,
}: {
	expense: Transaction;
	income: Transaction;
	onClose: () => void;
	onDone: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const from = expense.account?.name ?? "";
	const to = income.account?.name ?? "";

	async function submit() {
		const pair = { expense_id: expense.id, income_id: income.id };
		if (await run(() => linkTransferFn({ data: pair }))) {
			notify("Made one transfer. The other entry is in the trash");
			onDone();
			sheet.close();
		}
	}

	return (
		<Dialog
			open={sheet.open}
			onClose={sheet.close}
			maxWidth="xs"
			aria-labelledby="make-transfer-title"
			slotProps={{ transition: { onExited: sheet.onExited } }}
		>
			<DialogTitle id="make-transfer-title">Make one transfer</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Move <Money amount={expense.amount} currency={expense.currency} /> from {from} to {to}
					{expense.currency === income.currency
						? ""
						: `, arriving as ${formatMoney(income.amount, income.currency)}`}
					? The expense becomes the transfer, and the income goes to the trash. Balances stay as
					they are, and neither counts as spending or income any more. The expense&apos;s category
					and vendor are dropped, because transfers have none.
				</DialogContentText>
				{error && (
					<Alert severity="error" sx={{ mt: 2 }}>
						{error}
					</Alert>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={sheet.close} color="inherit">
					Cancel
				</Button>
				<Button variant="contained" onClick={submit} loading={pending}>
					Make transfer
				</Button>
			</DialogActions>
		</Dialog>
	);
}
