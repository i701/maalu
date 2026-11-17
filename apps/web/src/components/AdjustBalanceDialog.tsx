import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Money from "#/components/Money";
import { adjustmentPreview } from "#/lib/accounts";
import { formatMoney, todayIso } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { adjustAccountFn } from "#/server/accounts";
import type { Account } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const KIND = { income: "an income", expense: "an expense" } as const;

const schema = z.object({
	mode: z.enum(["balance", "amount"]),
	value: z
		.string()
		.trim()
		.regex(/^-?\d+(\.\d{1,4})?$/, "Enter an amount, like 1250.50"),
	date: z.iso
		.date()
		.or(z.literal(""))
		.transform((v) => v || undefined),
	note: z
		.string()
		.trim()
		.max(1000)
		.transform((v) => v || null),
});

/** Make an account match its bank. You say what the bank shows (or how much to add or take away),
 * and the difference is recorded as an adjustment: it fixes the balance, and is not counted as
 * income or spending. */
export default function AdjustBalanceDialog({
	account,
	onClose,
}: {
	account: Account;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const { control, handleSubmit, setValue } = useForm<
		z.input<typeof schema>,
		unknown,
		z.output<typeof schema>
	>({
		resolver: zodResolver(schema),
		defaultValues: { mode: "balance", value: "", date: todayIso(), note: "" },
	});
	const [mode, typed] = useWatch({ control, name: ["mode", "value"] });
	const preview = adjustmentPreview(account.balance, mode, typed);

	async function submit({ mode: how, value, date, note }: z.output<typeof schema>) {
		const result = adjustmentPreview(account.balance, how, value);
		if (!result || result.kind === null) return; // nothing to adjust: the alert says so
		const ok = await run(() =>
			adjustAccountFn({
				data: {
					id: account.id,
					...(how === "balance" ? { new_balance: value } : { amount: value }),
					date,
					note,
				},
			}),
		);
		if (ok) {
			notify(`"${account.name}" now matches: ${formatMoney(result.after, account.currency)}`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Adjust "${account.name}"`}
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
			submitLabel="Adjust"
		>
			<ToggleButtonGroup
				exclusive
				fullWidth
				size="small"
				value={mode}
				onChange={(_, next: typeof mode | null) => next && setValue("mode", next)}
				aria-label="How to adjust"
				sx={{ mb: 2 }}
			>
				<ToggleButton value="balance">Set to balance</ToggleButton>
				<ToggleButton value="amount">Add or take away</ToggleButton>
			</ToggleButtonGroup>

			<FormTextField
				control={control}
				name="value"
				label={mode === "balance" ? "Balance at your bank" : "Amount"}
				required
				autoFocus
				placeholder="0.00"
				helperText={
					mode === "balance"
						? `Maalu shows ${formatMoney(account.balance, account.currency)} now.`
						: "Positive adds money, negative takes it away."
				}
				slotProps={{ htmlInput: { inputMode: "decimal" } }}
				sx={{ mb: 2 }}
			/>

			{preview && preview.kind !== null && (
				<Alert severity="info" sx={{ mb: 2 }}>
					<Money amount={account.balance} currency={account.currency} /> →{" "}
					<Money amount={preview.after} currency={account.currency} />.{" "}
					{KIND[preview.kind][0].toUpperCase()}
					{KIND[preview.kind].slice(1)} of{" "}
					<Money amount={preview.amount} currency={account.currency} /> will be recorded, and it is
					not counted as income or spending.
				</Alert>
			)}
			{preview && preview.kind === null && (
				<Alert severity="success" sx={{ mb: 2 }}>
					The balance already matches: there is nothing to adjust.
				</Alert>
			)}

			<FormTextField
				control={control}
				name="date"
				label="Date"
				type="date"
				helperText="From this day on. Use an earlier date if the difference goes back."
				slotProps={{ inputLabel: { shrink: true } }}
				sx={{ mb: 2 }}
			/>
			<FormTextField
				control={control}
				name="note"
				label="Note (optional)"
				placeholder="Balance adjustment"
				slotProps={{ htmlInput: { maxLength: 1000 } }}
			/>
		</FormDialog>
	);
}
