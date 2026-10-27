import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatDate, formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createSubscriptionFromTransactionFn } from "#/server/subscriptions";
import { INTERVAL_UNITS, type IntervalUnit, type Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Mark an existing transaction as the first payment of a new subscription. */
export default function MakeSubscriptionDialog({
	transaction,
	onClose,
}: {
	transaction: Transaction;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const defaultName = transaction.vendor?.name ?? transaction.category;

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const ok = await run(() =>
			createSubscriptionFromTransactionFn({
				data: {
					transaction_id: transaction.id,
					name: String(f.get("name")).trim() || undefined,
					interval_unit: String(f.get("interval_unit")) as IntervalUnit,
					interval_count: Number(f.get("interval_count")),
				},
			}),
		);
		if (ok) {
			notify("Subscription created from transaction");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Make this a subscription"
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				{formatMoney(transaction.amount.replace("-", ""), transaction.currency)} on{" "}
				{formatDate(transaction.transaction_date)} becomes the first payment. Amount, currency,
				rate, vendor and category are copied.
			</Typography>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Name"
						name="name"
						defaultValue={defaultName}
						slotProps={{ htmlInput: { maxLength: 200 } }}
						autoFocus
					/>
				</Grid>
				<Grid size={{ xs: 5 }}>
					<TextField
						label="Every"
						name="interval_count"
						type="number"
						defaultValue={1}
						required
						slotProps={{ htmlInput: { min: 1, max: 120 } }}
					/>
				</Grid>
				<Grid size={{ xs: 7 }}>
					<TextField
						select
						label="Billing period"
						name="interval_unit"
						defaultValue="month"
						required
					>
						{INTERVAL_UNITS.map((u) => (
							<MenuItem key={u} value={u}>
								{u[0].toUpperCase() + u.slice(1)}(s)
							</MenuItem>
						))}
					</TextField>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
