import { zodResolver } from "@hookform/resolvers/zod";
import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { datesOverlap, nextStretch } from "#/lib/budget";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetLineFn, limit, updateBudgetLineFn } from "#/server/budget";
import type { Budget, BudgetFixedLine, BudgetLine, Category } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const isDated = (l?: BudgetLine): l is BudgetFixedLine => Boolean(l && "end_date" in l);
/** A per-period limit that only runs between two dates. */
const isWindowed = (l?: BudgetLine) => Boolean(l?.runs_from);

const schema = z
	.object({
		name: z.string().trim().min(1, "Give the limit a name").max(200),
		category_ids: z.array(z.string()).min(1, "Choose at least one category"),
		amount: limit,
		warn_percent: z
			.string()
			.trim()
			.regex(/^\d*$/, "A whole number")
			.refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 100), "Between 1 and 100"),
		rollover: z.boolean(),
		// "Only for certain dates": both days, the last not before the first
		dated: z.boolean(),
		repeat: z.boolean(),
		start: z.string(),
		end: z.string(),
	})
	.superRefine((v, ctx) => {
		if (!v.dated) return;
		if (!v.start)
			ctx.addIssue({ code: "custom", path: ["start"], message: "Choose the first day" });
		if (!v.end) ctx.addIssue({ code: "custom", path: ["end"], message: "Choose the last day" });
		if (v.start && v.end && v.end < v.start)
			ctx.addIssue({
				code: "custom",
				path: ["end"],
				message: "The last day can't be before the first",
			});
	});

type FormControl = Control<z.input<typeof schema>, unknown, z.output<typeof schema>>;

/** The "only for certain dates" switch and, when it is on, the two dates. */
function DatesFields({
	control,
	dated,
	repeat,
	start,
}: {
	control: FormControl;
	dated: boolean;
	repeat: boolean;
	start: string;
}) {
	return (
		<>
			<Grid size={12}>
				<FormControlLabel
					control={
						<Controller
							name="dated"
							control={control}
							render={({ field }) => (
								<Switch checked={field.value} onChange={(_, on) => field.onChange(on)} />
							)}
						/>
					}
					label="Only for certain dates"
				/>
			</Grid>
			{dated && (
				<>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FormTextField
							control={control}
							name="start"
							label="From"
							type="date"
							required
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FormTextField
							control={control}
							name="end"
							label="Until"
							type="date"
							required
							helperText={
								repeat
									? "Inclusive. Whole periods count, so the dates snap to them"
									: "Inclusive. The limit is one total for the whole stretch"
							}
							slotProps={{
								inputLabel: { shrink: true },
								htmlInput: { min: start || undefined },
							}}
						/>
					</Grid>
					<Grid size={12}>
						<Controller
							name="repeat"
							control={control}
							render={({ field }) => (
								<TextField
									select
									label="How it counts"
									value={field.value ? "monthly" : "total"}
									onChange={(e) => field.onChange(e.target.value === "monthly")}
								>
									<MenuItem value="total">One total for the whole stretch</MenuItem>
									<MenuItem value="monthly">A limit for every period between these dates</MenuItem>
								</TextField>
							)}
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
	const { control, handleSubmit } = useForm<
		z.input<typeof schema>,
		unknown,
		z.output<typeof schema>
	>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: base?.name ?? "",
			category_ids: base
				? categories.filter((c) => base.categories.some((x) => x.id === c.id)).map((c) => c.id)
				: [],
			amount: base?.amount ?? "",
			warn_percent: line?.warn_percent?.toString() ?? "",
			rollover: line?.rollover ?? false,
			dated: isDated(line) || isWindowed(line) || Boolean(repeatOf),
			repeat: isWindowed(line),
			start: next?.start ?? (isDated(line) ? line.start_date : (line?.runs_from ?? "")),
			end: next?.end ?? (isDated(line) ? line.end_date : (line?.runs_until ?? "")),
		},
	});
	const [dated, repeat, start, end] = useWatch({
		control,
		name: ["dated", "repeat", "start", "end"],
	});

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

	async function submit(v: z.output<typeof schema>) {
		const fields = {
			name: v.name,
			category_ids: v.category_ids,
			amount: v.amount,
			rollover: v.dated && !v.repeat ? false : v.rollover,
		};
		const dates = v.dated ? { start_date: v.start, end_date: v.end, repeat: v.repeat } : {};
		const ok = await run(() =>
			line
				? updateBudgetLineFn({
						data: {
							id: line.id,
							changes: {
								...fields,
								...dates,
								// turning the dates off makes it a limit for every period again
								...((isDated(line) || isWindowed(line)) && !v.dated ? { end_date: null } : {}),
								warn_percent: v.warn_percent ? Number(v.warn_percent) : null,
							},
						},
					})
				: createBudgetLineFn({
						data: {
							...fields,
							...dates,
							warn_percent: v.warn_percent ? Number(v.warn_percent) : undefined,
						},
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
						placeholder="Food and drink"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={12}>
					<Controller
						name="category_ids"
						control={control}
						render={({ field, fieldState }) => (
							<Autocomplete
								multiple
								options={categories}
								value={categories.filter((c) => field.value.includes(c.id))}
								onChange={(_, value) => field.onChange(value.map((c) => c.id))}
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
										error={Boolean(fieldState.error)}
										helperText={
											fieldState.error?.message ??
											"Spending in these categories counts against the limit"
										}
									/>
								)}
							/>
						)}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="amount"
						label={
							dated && !repeat
								? `Limit for these dates (${budget.currency})`
								: `Limit per period (${budget.currency})`
						}
						placeholder="4000"
						required
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="warn_percent"
						label="Warn at (%)"
						type="number"
						helperText={`Blank uses the budget's ${budget.warn_percent}%`}
					/>
				</Grid>
				<DatesFields control={control} dated={dated} repeat={repeat} start={start} />
				{(!dated || repeat) && (
					<Grid size={12}>
						<FormControlLabel
							control={
								<Controller
									name="rollover"
									control={control}
									render={({ field }) => (
										<Switch checked={field.value} onChange={(_, on) => field.onChange(on)} />
									)}
								/>
							}
							label="Carry unspent money into the next period"
						/>
					</Grid>
				)}
			</Grid>
		</FormDialog>
	);
}
