import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { moveProblem, moveSources } from "#/lib/budget-moves";
import { formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetMoveFn } from "#/server/budget";
import type { Budget, BudgetLine } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

const TOP_UP = "";

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
	const [from, setFrom] = useState(sources.find((s) => s.usable)?.line.id ?? TOP_UP);
	const [localError, setLocalError] = useState<string | null>(null);
	const source = sources.find((s) => s.line.id === from) ?? null;
	const money = (v: string) => formatMoney(v, budget.currency);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const amount = String(f.get("amount") ?? "").trim();
		const note = String(f.get("note") ?? "").trim();
		const problem = moveProblem(amount, source ? source.left : null);
		setLocalError(problem);
		if (problem) return;
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
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			submitLabel={source ? "Move" : "Add"}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						select
						label="From"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
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
					</TextField>
				</Grid>
				<Grid size={12}>
					<TextField
						label={`Amount (${budget.currency})`}
						name="amount"
						required
						autoFocus
						placeholder="500"
						helperText={source ? `Up to ${money(source.left)}` : undefined}
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={12}>
					<TextField
						label="Note (optional)"
						name="note"
						placeholder="Guests over for the weekend"
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
