import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { moveProblem, moveSources } from "#/lib/budget-moves";
import { formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetMoveFn } from "#/server/budget";
import type { Budget, BudgetLine } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const TOP_UP = "";

/** The move's fields; the amount must fit in what the chosen source has left. */
const moveSchema = (sources: ReturnType<typeof moveSources>) =>
	z
		.object({ from: z.string(), amount: z.string().trim(), note: z.string().trim().max(200) })
		.superRefine(({ from, amount }, ctx) => {
			const left = sources.find((s) => s.line.id === from)?.left ?? null;
			const problem = moveProblem(amount, left);
			if (problem) ctx.addIssue({ code: "custom", path: ["amount"], message: problem });
		});

/** Move money into a monthly limit from another one for the period shown, or add to it for that
 * period only. A limit gives at most what it has left. */
export default function MoveMoneyDialog({
	budget,
	line,
	onClose,
}: {
	budget: Budget;
	/** The limit that gets the money */
	line: BudgetLine;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const sources = moveSources(budget, line.id);
	const schema = moveSchema(sources);
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			from: sources.find((s) => s.usable)?.line.id ?? TOP_UP,
			amount: "",
			note: "",
		},
	});
	const from = useWatch({ control, name: "from" });
	const source = sources.find((s) => s.line.id === from) ?? null;
	const money = (v: string) => formatMoney(v, budget.currency);

	async function submit({ amount, note }: z.output<typeof schema>) {
		const ok = await run(() =>
			createBudgetMoveFn({
				data: {
					to_line_id: line.id,
					from_line_id: source?.line.id,
					amount,
					on: budget.period.start,
					note: note || undefined,
				},
			}),
		);
		if (ok) {
			notify(
				source
					? `Moved ${money(amount)} from ${source.line.name} to ${line.name}`
					: `Added ${money(amount)} to ${line.name} for this period`,
			);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Move money to ${line.name}`}
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			submitLabel={source ? "Move" : "Add"}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="from"
						select
						label="From"
						helperText={
							source
								? "For this period only. Next period both limits are back to normal."
								: "Adds to this limit for this period only, without taking from another."
						}
					>
						{sources.map((s) => (
							<MenuItem key={s.line.id} value={s.line.id} disabled={!s.usable}>
								{s.line.name} · {s.usable ? `${money(s.left)} left` : "nothing left"}
							</MenuItem>
						))}
						<MenuItem value={TOP_UP}>Nowhere: just add to this limit</MenuItem>
					</FormTextField>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="amount"
						label={`Amount (${budget.currency})`}
						required
						autoFocus
						placeholder="500"
						helperText={source ? `Up to ${money(source.left)}` : undefined}
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="note"
						label="Note (optional)"
						placeholder="Guests over for the weekend"
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
