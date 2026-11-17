import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createBudgetLineFn, updateBudgetLineFn } from "#/server/budget";
import type { Budget, BudgetFixedLine, BudgetLine, Category } from "#/types/api";
import CategoriesPicker from "./budget-line-form/CategoriesPicker";
import DatesFields from "./budget-line-form/DatesFields";
import {
	isDated,
	isWindowed,
	limitDefaults,
	limitFields,
	limitSchema,
	type LimitValues,
	takenByOthers,
} from "./budget-line-form/form";
import FormDialog from "./FormDialog";
import FormSwitch from "./FormSwitch";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

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
	const { control, handleSubmit } = useForm<z.input<typeof limitSchema>, unknown, LimitValues>({
		resolver: zodResolver(limitSchema),
		defaultValues: limitDefaults(line, repeatOf, categories),
	});
	const [dated, repeat, start, end] = useWatch({
		control,
		name: ["dated", "repeat", "start", "end"],
	});

	// Those taken by other limits are shown but disabled.
	const takenBy = useMemo(
		() => takenByOthers(budget, line?.id, { dated, repeat, start, end }),
		[budget, line?.id, dated, repeat, start, end],
	);

	async function submit(v: LimitValues) {
		const fields = limitFields(v);
		const warn = v.warn_percent ? Number(v.warn_percent) : null;
		// turning the dates off makes a limit for set dates one for every period again
		const undated = line && (isDated(line) || isWindowed(line)) && !v.dated;
		const ok = await run(() =>
			line
				? updateBudgetLineFn({
						data: {
							id: line.id,
							changes: { ...fields, ...(undated ? { end_date: null } : {}), warn_percent: warn },
						},
					})
				: createBudgetLineFn({ data: { ...fields, warn_percent: warn ?? undefined } }),
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
					<CategoriesPicker control={control} categories={categories} takenBy={takenBy} />
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
						<FormSwitch
							control={control}
							name="rollover"
							label="Carry unspent money into the next period"
						/>
					</Grid>
				)}
			</Grid>
		</FormDialog>
	);
}
