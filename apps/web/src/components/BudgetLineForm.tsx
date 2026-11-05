import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetLineFn, updateBudgetLineFn } from "#/server/budget";
import { datesOverlap } from "#/lib/budget";
import type { Budget, BudgetFixedLine, BudgetLine, Category } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

const isDated = (l?: BudgetLine): l is BudgetFixedLine => Boolean(l && "end_date" in l);

/** The "only for certain dates" switch and, when it is on, the two dates. */
function DatesFields({
	dated,
	start,
	end,
	onDated,
	onStart,
	onEnd,
}: {
	dated: boolean;
	start: string;
	end: string;
	onDated: (on: boolean) => void;
	onStart: (v: string) => void;
	onEnd: (v: string) => void;
}) {
	return (
		<>
			<Grid size={12}>
				<FormControlLabel
					control={<Switch checked={dated} onChange={(_, v) => onDated(v)} />}
					label="Only for certain dates"
				/>
			</Grid>
			{dated && (
				<>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							label="From"
							type="date"
							required
							value={start}
							onChange={(e) => onStart(e.target.value)}
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							label="Until"
							type="date"
							required
							value={end}
							onChange={(e) => onEnd(e.target.value)}
							helperText="Inclusive. The limit is one total for the whole stretch"
							slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: start || undefined } }}
						/>
					</Grid>
				</>
			)}
		</>
	);
}

/** Add or edit a spending limit: a name, the categories it covers, the amount (per period, or for
 * set dates), an optional warning level of its own, and whether unspent money rolls over. */
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
	const [dated, setDated] = useState(() => isDated(line));
	const [start, setStart] = useState(() => (isDated(line) ? line.start_date : ""));
	const [end, setEnd] = useState(() => (isDated(line) ? line.end_date : ""));
	const [localError, setLocalError] = useState<string | null>(null);

	// A category can be in one per-period line only, and in one limit per stretch of dates, so those
	// taken by other lines are shown but disabled.
	const takenBy = useMemo(() => {
		const others: BudgetLine[] =
			dated && start && end
				? (budget.fixed_lines ?? []).filter((l) =>
						datesOverlap([start, end], [l.start_date, l.end_date]),
					)
				: dated
					? []
					: budget.lines;
		const map = new Map<string, string>();
		for (const l of others) {
			if (l.id === line?.id) continue;
			for (const c of l.categories) map.set(c.id, l.name);
		}
		return map;
	}, [budget.lines, budget.fixed_lines, line?.id, dated, start, end]);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (chosen.length === 0) return setLocalError("Choose at least one category");
		if (dated && (!start || !end)) return setLocalError("Choose the first and last day");
		if (dated && end < start) return setLocalError("The last day can't be before the first");
		setLocalError(null);
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const warn = text("warn_percent");
		const fields = {
			name: text("name"),
			category_ids: chosen.map((c) => c.id),
			amount: text("amount"),
			rollover: dated ? false : rollover,
		};
		const dates = dated ? { start_date: start, end_date: end } : {};
		const ok = await run(() =>
			line
				? updateBudgetLineFn({
						data: {
							id: line.id,
							changes: {
								...fields,
								...dates,
								// turning the dates off makes it a limit for every period again
								...(isDated(line) && !dated ? { end_date: null } : {}),
								warn_percent: warn ? Number(warn) : null,
							},
						},
					})
				: createBudgetLineFn({
						data: { ...fields, ...dates, warn_percent: warn ? Number(warn) : undefined },
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
						label={
							dated
								? `Limit for these dates (${budget.currency})`
								: `Limit per period (${budget.currency})`
						}
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
				<DatesFields
					dated={dated}
					start={start}
					end={end}
					onDated={setDated}
					onStart={setStart}
					onEnd={setEnd}
				/>
				{!dated && (
					<Grid size={12}>
						<FormControlLabel
							control={<Switch checked={rollover} onChange={(_, v) => setRollover(v)} />}
							label="Carry unspent money into the next period"
						/>
					</Grid>
				)}
			</Grid>
		</FormDialog>
	);
}
