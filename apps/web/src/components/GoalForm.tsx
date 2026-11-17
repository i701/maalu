import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createGoalFn, money, updateGoalFn } from "#/server/goals";
import type { Account, Goal } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const BY_HAND = "";

// The optional fields stay "" when blank; submit turns that into null (edit) or leaves it out (new).
const schema = z.object({
	name: z.string().trim().min(1, "Give the goal a name").max(200),
	target_amount: money,
	target_date: z.iso.date().or(z.literal("")),
	source: z.string(),
	monthly_amount: money.or(z.literal("")),
});

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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			name: goal?.name ?? "",
			target_amount: goal?.target_amount ?? "",
			target_date: goal?.target_date ?? "",
			source: goal?.account?.id ?? BY_HAND,
			monthly_amount: goal?.monthly_amount ?? "",
		},
	});
	const source = useWatch({ control, name: "source" });

	// A cards/loans balance is debt, and an account can follow only one goal.
	const taken = new Set(
		goals.filter((g) => g.id !== goal?.id && g.account).map((g) => g.account?.id),
	);
	const choices = accounts.filter((a) => !a.is_liability);

	async function submit(v: z.output<typeof schema>) {
		const fields = { name: v.name, target_amount: v.target_amount };
		const ok = await run(() =>
			goal
				? updateGoalFn({
						data: {
							id: goal.id,
							changes: {
								...fields,
								target_date: v.target_date || null,
								monthly_amount: v.monthly_amount || null,
								account_id: v.source || null,
							},
						},
					})
				: createGoalFn({
						data: {
							...fields,
							target_date: v.target_date || undefined,
							monthly_amount: v.monthly_amount || undefined,
							account_id: v.source || undefined,
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
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="name"
						label="Name"
						placeholder="Trip fund"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="target_amount"
						label={`Target (${currency})`}
						placeholder="10000"
						required
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="target_date"
						label="Target date"
						type="date"
						helperText="Optional. Used to work out what to save each month"
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="source"
						select
						label="Where is the money?"
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
					</FormTextField>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="monthly_amount"
						label={`Plan to set aside each period (${currency})`}
						helperText="Optional. The budget then shows whether this period's amount is done"
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
