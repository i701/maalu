import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatDate, formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import {
	acceptSubscriptionCandidateFn,
	repeatFields,
	subscriptionFormFields,
} from "#/server/subscriptions";
import { INTERVAL_UNIT_LABELS, INTERVAL_UNITS, type SubscriptionCandidate } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const schema = z.object({ ...subscriptionFormFields, ...repeatFields });

/** The confirm step for a suggested subscription: what it will hold, ready to change before it is
 * made. Making it links the payments already made, so the next one is planned in their place. */
export default function AcceptSuggestionDialog({
	candidate,
	onClose,
}: {
	candidate: SubscriptionCandidate;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			name: candidate.vendor_name,
			amount: candidate.amount,
			interval_count: String(candidate.interval_count),
			interval_unit: candidate.interval_unit,
		},
	});

	async function submit(values: z.output<typeof schema>) {
		const sent = await run(() =>
			acceptSubscriptionCandidateFn({
				data: { vendor_id: candidate.vendor_id, currency: candidate.currency, ...values },
			}),
		);
		if (sent) {
			notify(`Added ${values.name}. Its next payment is planned.`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Add as a subscription"
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
			submitLabel="Add subscription"
		>
			<Stack sx={{ gap: 2 }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Seen {candidate.occurrences} times since {formatDate(candidate.first_date)}, last on{" "}
					{formatDate(candidate.last_date)}. Those payments will be linked to it, and the next one
					planned for {formatDate(candidate.next_due)}.
				</Typography>
				<FormTextField
					control={control}
					name="name"
					label="Name"
					required
					slotProps={{ htmlInput: { maxLength: 200 } }}
				/>
				<FormTextField
					control={control}
					name="amount"
					label={`Amount (${candidate.currency})`}
					required
					helperText={
						candidate.amount_varies
							? `It changes each time; the last was ${formatMoney(candidate.amount, candidate.currency)}. Its payments are estimates until you enter the real amount.`
							: undefined
					}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
				<Stack direction="row" sx={{ gap: 2 }}>
					<FormTextField
						control={control}
						name="interval_count"
						label="Every"
						type="number"
						slotProps={{ htmlInput: { min: 1, max: 120 } }}
						sx={{ width: 110 }}
					/>
					<FormTextField
						control={control}
						name="interval_unit"
						select
						label="Unit"
						sx={{ flex: 1 }}
					>
						{INTERVAL_UNITS.map((u) => (
							<MenuItem key={u} value={u}>
								{INTERVAL_UNIT_LABELS[u]}
							</MenuItem>
						))}
					</FormTextField>
				</Stack>
			</Stack>
		</FormDialog>
	);
}
