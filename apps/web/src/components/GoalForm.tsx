import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createGoalFn, updateGoalFn } from "#/server/goals";
import type { Account, Goal } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

const BY_HAND = "";

/** Add or edit a savings goal. Its progress follows a savings account's balance, or, with no
 * account, a log of money you set aside by hand (for savings kept inside your main account). */
export default function GoalForm({
	goal,
	goals,
	accounts,
	currency,
	onClose,
}: {
	/** undefined = create a new goal */
	goal?: Goal;
	goals: Goal[];
	accounts: Account[];
	currency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [source, setSource] = useState(goal?.account?.id ?? BY_HAND);

	// A cards/loans balance is debt, and an account can follow only one goal.
	const taken = new Set(
		goals.filter((g) => g.id !== goal?.id && g.account).map((g) => g.account!.id),
	);
	const choices = accounts.filter((a) => !a.is_liability);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const fields = { name: text("name"), target_amount: text("target_amount") };
		const ok = await run(() =>
			goal
				? updateGoalFn({
						data: {
							id: goal.id,
							changes: {
								...fields,
								target_date: text("target_date") || null,
								monthly_amount: text("monthly_amount") || null,
								account_id: source || null,
							},
						},
					})
				: createGoalFn({
						data: {
							...fields,
							target_date: text("target_date") || undefined,
							monthly_amount: text("monthly_amount") || undefined,
							account_id: source || undefined,
						},
					}),
		);
		if (ok) {
			notify(goal ? "Goal updated" : "Goal added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={goal ? "Edit goal" : "Add goal"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Name"
						name="name"
						defaultValue={goal?.name}
						placeholder="Trip fund"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label={`Target (${currency})`}
						name="target_amount"
						defaultValue={goal?.target_amount}
						placeholder="10000"
						required
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Target date"
						name="target_date"
						type="date"
						defaultValue={goal?.target_date ?? ""}
						helperText="Optional. Used to work out what to save each month"
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
				<Grid size={12}>
					<TextField
						select
						label="Where is the money?"
						value={source}
						onChange={(e) => setSource(e.target.value)}
						helperText={
							source
								? "Progress follows this account's balance"
								: "Progress is the money you set aside by hand"
						}
					>
						<MenuItem value={BY_HAND}>Inside my accounts: I'll set it aside by hand</MenuItem>
						{choices.map((a) => (
							<MenuItem key={a.id} value={a.id} disabled={taken.has(a.id)}>
								{a.name}
								{taken.has(a.id) ? " (used by another goal)" : ""}
							</MenuItem>
						))}
					</TextField>
				</Grid>
				<Grid size={12}>
					<TextField
						label={`Plan to set aside each period (${currency})`}
						name="monthly_amount"
						defaultValue={goal?.monthly_amount ?? ""}
						helperText="Optional. The budget then shows whether this period's amount is done"
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
