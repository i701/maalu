import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetLineFn, updateBudgetLineFn } from "#/server/budget";
import type { Budget, BudgetLine, Category } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Add or edit a spending limit: a name, the categories it covers, the amount per period, an
 * optional warning level of its own, and whether unspent money rolls over. */
export default function BudgetLineForm({
	line,
	budget,
	categories,
	onClose,
}: {
	/** undefined = create a new line */
	line?: BudgetLine;
	budget: Budget;
	categories: Category[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [chosen, setChosen] = useState<Category[]>(() =>
		line ? categories.filter((c) => line.categories.some((x) => x.id === c.id)) : [],
	);
	const [rollover, setRollover] = useState(line?.rollover ?? false);
	const [localError, setLocalError] = useState<string | null>(null);

	// A category can be in one line only, so those taken by other lines are shown but disabled.
	const takenBy = useMemo(() => {
		const map = new Map<string, string>();
		for (const l of budget.lines) {
			if (l.id === line?.id) continue;
			for (const c of l.categories) map.set(c.id, l.name);
		}
		return map;
	}, [budget.lines, line?.id]);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (chosen.length === 0) return setLocalError("Choose at least one category");
		setLocalError(null);
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const warn = text("warn_percent");
		const fields = {
			name: text("name"),
			category_ids: chosen.map((c) => c.id),
			amount: text("amount"),
			rollover,
		};
		const ok = await run(() =>
			line
				? updateBudgetLineFn({
						data: { id: line.id, changes: { ...fields, warn_percent: warn ? Number(warn) : null } },
					})
				: createBudgetLineFn({
						data: { ...fields, warn_percent: warn ? Number(warn) : undefined },
					}),
		);
		if (ok) {
			notify(line ? "Limit updated" : "Limit added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={line ? "Edit limit" : "Add limit"}
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Name"
						name="name"
						defaultValue={line?.name}
						placeholder="Food and drink"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={12}>
					<Autocomplete
						multiple
						options={categories}
						value={chosen}
						onChange={(_, value) => setChosen(value)}
						getOptionLabel={(c) => c.name}
						getOptionDisabled={(c) => takenBy.has(c.id)}
						isOptionEqualToValue={(a, b) => a.id === b.id}
						noOptionsText="No categories yet. Add one on the Categories page"
						renderOption={({ key, ...props }, c) => (
							<li key={key} {...props}>
								{c.name}
								{takenBy.has(c.id) && (
									<span style={{ marginLeft: 8, opacity: 0.6 }}>in "{takenBy.get(c.id)}"</span>
								)}
							</li>
						)}
						renderInput={(params) => (
							<TextField
								{...params}
								label="Categories"
								helperText="Spending in these categories counts against the limit"
							/>
						)}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label={`Limit per period (${budget.currency})`}
						name="amount"
						defaultValue={line?.amount}
						placeholder="4000"
						required
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Warn at (%)"
						name="warn_percent"
						type="number"
						defaultValue={line?.warn_percent ?? ""}
						helperText={`Blank uses the budget's ${budget.warn_percent}%`}
						slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
					/>
				</Grid>
				<Grid size={12}>
					<FormControlLabel
						control={<Switch checked={rollover} onChange={(_, v) => setRollover(v)} />}
						label="Carry unspent money into the next period"
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
