import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetLineFn, updateBudgetLineFn } from "#/server/budget";
import { datesOverlap, nextStretch } from "#/lib/budget";
import MenuItem from "@mui/material/MenuItem";
import type { Budget, BudgetFixedLine, BudgetLine, Category } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

const isDated = (l?: BudgetLine): l is BudgetFixedLine => Boolean(l && "end_date" in l);
/** A per-period limit that only runs between two dates. */
const isWindowed = (l?: BudgetLine) => Boolean(l?.runs_from);

/** The "only for certain dates" switch and, when it is on, the two dates. */
function DatesFields({
	dated,
	repeat,
	start,
	end,
	onDated,
	onRepeat,
	onStart,
	onEnd,
}: {
	dated: boolean;
	repeat: boolean;
	start: string;
	end: string;
	onDated: (on: boolean) => void;
	onRepeat: (on: boolean) => void;
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
							helperText={
								repeat
									? "Inclusive. Whole periods count, so the dates snap to them"
									: "Inclusive. The limit is one total for the whole stretch"
							}
							slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: start || undefined } }}
						/>
					</Grid>
					<Grid size={12}>
						<TextField
							select
							label="How it counts"
							value={repeat ? "monthly" : "total"}
							onChange={(e) => onRepeat(e.target.value === "monthly")}
						>
							<MenuItem value="total">One total for the whole stretch</MenuItem>
							<MenuItem value="monthly">A limit for every period between these dates</MenuItem>
						</TextField>
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
	repeatOf,
	budget,
	categories,
	onClose,
}: {
	/** undefined = create a new line */
	line?: BudgetLine;
	/** A finished limit for set dates to start the next stretch from (a new limit, filled in) */
	repeatOf?: BudgetFixedLine;
	budget: Budget;
	categories: Category[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const base = line ?? repeatOf;
	const next = repeatOf ? nextStretch(repeatOf) : null;
	const [chosen, setChosen] = useState<Category[]>(() =>
		base ? categories.filter((c) => base.categories.some((x) => x.id === c.id)) : [],
	);
	const [rollover, setRollover] = useState(line?.rollover ?? false);
	const [dated, setDated] = useState(() => isDated(line) || isWindowed(line) || Boolean(repeatOf));
	const [repeat, setRepeat] = useState(() => isWindowed(line));
	const [start, setStart] = useState(
		() => next?.start ?? (isDated(line) ? line.start_date : (line?.runs_from ?? "")),
	);
	const [end, setEnd] = useState(
		() => next?.end ?? (isDated(line) ? line.end_date : (line?.runs_until ?? "")),
	);
	const [localError, setLocalError] = useState<string | null>(null);

	// A category can be in one per-period line only, and in one limit per stretch of dates, so those
	// taken by other lines are shown but disabled.
	const takenBy = useMemo(() => {
		// (a limit that runs between dates is checked by the server, which knows every period)
		const others: BudgetLine[] =
			dated && !repeat && start && end
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
	}, [budget.lines, budget.fixed_lines, line?.id, dated, repeat, start, end]);

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
			rollover: dated && !repeat ? false : rollover,
		};
		const dates = dated ? { start_date: start, end_date: end, repeat } : {};
		const ok = await run(() =>
			line
				? updateBudgetLineFn({
						data: {
							id: line.id,
							changes: {
								...fields,
								...dates,
								// turning the dates off makes it a limit for every period again
								...((isDated(line) || isWindowed(line)) && !dated ? { end_date: null } : {}),
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
			title={line ? "Edit limit" : repeatOf ? "Repeat limit" : "Add limit"}
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
						defaultValue={base?.name}
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
							dated && !repeat
								? `Limit for these dates (${budget.currency})`
								: `Limit per period (${budget.currency})`
						}
						name="amount"
						defaultValue={base?.amount}
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
					repeat={repeat}
					start={start}
					end={end}
					onDated={setDated}
					onRepeat={setRepeat}
					onStart={setStart}
					onEnd={setEnd}
				/>
				{(!dated || repeat) && (
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
