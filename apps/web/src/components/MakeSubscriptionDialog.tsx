import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Money from "#/components/Money";
import { formatDate } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createSubscriptionFromTransactionFn, repeatFields } from "#/server/subscriptions";
import { INTERVAL_UNITS, type Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const schema = z.object({
	// blank keeps the vendor's or category's name
	name: z
		.string()
		.trim()
		.max(200)
		.transform((v) => v || undefined),
	...repeatFields,
});

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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			name: transaction.vendor?.name ?? transaction.category,
			interval_count: "1",
			interval_unit: "month",
		},
	});

	async function submit(values: z.output<typeof schema>) {
		const ok = await run(() =>
			createSubscriptionFromTransactionFn({ data: { transaction_id: transaction.id, ...values } }),
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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				<Money amount={transaction.amount.replace("-", "")} currency={transaction.currency} /> on{" "}
				{formatDate(transaction.transaction_date)} becomes the first payment. Amount, currency,
				rate, vendor and category are copied.
			</Typography>
			<Grid container spacing={2}>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="name"
						label="Name"
						slotProps={{ htmlInput: { maxLength: 200 } }}
						autoFocus
					/>
				</Grid>
				<Grid size={{ xs: 5 }}>
					<FormTextField
						control={control}
						name="interval_count"
						label="Every"
						type="number"
						required
						slotProps={{ htmlInput: { min: 1, max: 120 } }}
					/>
				</Grid>
				<Grid size={{ xs: 7 }}>
					<FormTextField
						control={control}
						name="interval_unit"
						select
						label="Billing period"
						required
					>
						{INTERVAL_UNITS.map((u) => (
							<MenuItem key={u} value={u}>
								{u[0].toUpperCase() + u.slice(1)}(s)
							</MenuItem>
						))}
					</FormTextField>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
