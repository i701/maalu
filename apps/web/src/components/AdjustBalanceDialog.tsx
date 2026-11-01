import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useState } from "react";
import { type AdjustMode, adjustmentPreview } from "#/lib/accounts";
import { formatMoney, todayIso } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { adjustAccountFn } from "#/server/accounts";
import type { Account } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

const KIND = { income: "an income", expense: "an expense" } as const;

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
	const [mode, setMode] = useState<AdjustMode>("balance");
	const [typed, setTyped] = useState("");
	const preview = adjustmentPreview(account.balance, mode, typed);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!preview || preview.kind === null) return;
		const f = new FormData(e.currentTarget);
		const value = typed.trim();
		const date = String(f.get("date") ?? "") || undefined;
		const note = String(f.get("note") ?? "").trim() || null;
		const ok = await run(() =>
			adjustAccountFn({
				data: {
					id: account.id,
					...(mode === "balance" ? { new_balance: value } : { amount: value }),
					date,
					note,
				},
			}),
		);
		if (ok) {
			notify(`"${account.name}" now matches: ${formatMoney(preview.after, account.currency)}`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Adjust "${account.name}"`}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
			submitLabel="Adjust"
		>
			<ToggleButtonGroup
				exclusive
				fullWidth
				size="small"
				value={mode}
				onChange={(_, next: AdjustMode | null) => next && setMode(next)}
				aria-label="How to adjust"
				sx={{ mb: 2 }}
			>
				<ToggleButton value="balance">Set to balance</ToggleButton>
				<ToggleButton value="amount">Add or take away</ToggleButton>
			</ToggleButtonGroup>

			<TextField
				label={mode === "balance" ? "Balance at your bank" : "Amount"}
				value={typed}
				onChange={(e) => setTyped(e.target.value)}
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
					{formatMoney(account.balance, account.currency)} →{" "}
					{formatMoney(preview.after, account.currency)}. {KIND[preview.kind][0].toUpperCase()}
					{KIND[preview.kind].slice(1)} of {formatMoney(preview.amount, account.currency)} will be
					recorded, and it is not counted as income or spending.
				</Alert>
			)}
			{preview && preview.kind === null && (
				<Alert severity="success" sx={{ mb: 2 }}>
					The balance already matches: there is nothing to adjust.
				</Alert>
			)}

			<TextField
				label="Date"
				name="date"
				type="date"
				defaultValue={todayIso()}
				helperText="From this day on. Use an earlier date if the difference goes back."
				slotProps={{ inputLabel: { shrink: true } }}
				sx={{ mb: 2 }}
			/>
			<TextField
				label="Note (optional)"
				name="note"
				placeholder="Balance adjustment"
				slotProps={{ htmlInput: { maxLength: 1000 } }}
			/>
		</FormDialog>
	);
}
