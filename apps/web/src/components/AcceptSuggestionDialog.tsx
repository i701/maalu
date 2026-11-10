import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type FormEvent } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { acceptSubscriptionCandidateFn } from "#/server/subscriptions";
import {
	INTERVAL_UNIT_LABELS,
	INTERVAL_UNITS,
	type IntervalUnit,
	type SubscriptionCandidate,
} from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

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

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const name = String(form.get("name") ?? "").trim();
		const sent = await run(() =>
			acceptSubscriptionCandidateFn({
				data: {
					vendor_id: candidate.vendor_id,
					currency: candidate.currency,
					name: name || undefined,
					amount: String(form.get("amount") ?? "") || undefined,
					interval_unit: String(form.get("interval_unit")) as IntervalUnit,
					interval_count: Number(form.get("interval_count")) || 1,
				},
			}),
		);
		if (sent) {
			notify(`Added ${name || candidate.vendor_name}. Its next payment is planned.`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Add as a subscription"
			error={error}
			pending={pending}
			onSubmit={submit}
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
				<TextField
					label="Name"
					name="name"
					defaultValue={candidate.vendor_name}
					required
					slotProps={{ htmlInput: { maxLength: 200 } }}
				/>
				<TextField
					label={`Amount (${candidate.currency})`}
					name="amount"
					defaultValue={candidate.amount}
					required
					helperText={
						candidate.amount_varies
							? `It changes each time; the last was ${formatMoney(candidate.amount, candidate.currency)}. Its payments are estimates until you enter the real amount.`
							: undefined
					}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
				<Stack direction="row" sx={{ gap: 2 }}>
					<TextField
						label="Every"
						name="interval_count"
						type="number"
						defaultValue={candidate.interval_count}
						slotProps={{ htmlInput: { min: 1, max: 120 } }}
						sx={{ width: 110 }}
					/>
					<TextField
						select
						label="Unit"
						name="interval_unit"
						defaultValue={candidate.interval_unit}
						sx={{ flex: 1 }}
					>
						{INTERVAL_UNITS.map((u) => (
							<MenuItem key={u} value={u}>
								{INTERVAL_UNIT_LABELS[u]}
							</MenuItem>
						))}
					</TextField>
				</Stack>
			</Stack>
		</FormDialog>
	);
}
