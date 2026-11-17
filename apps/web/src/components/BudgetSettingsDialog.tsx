import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { budgetSettingsSchema, updateBudgetFn } from "#/server/budget";
import type { Budget } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** When a budget period starts, and the default level at which a line is flagged as close. */
export default function BudgetSettingsDialog({
	budget,
	onClose,
}: {
	budget: Budget;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	const { control, handleSubmit } = useForm({
		resolver: zodResolver(budgetSettingsSchema),
		defaultValues: {
			period_start_day: budget.period_start_day,
			warn_percent: String(budget.warn_percent),
		},
	});

	async function submit(data: z.output<typeof budgetSettingsSchema>) {
		const ok = await run(() => updateBudgetFn({ data }));
		if (ok) {
			notify("Budget settings saved");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Budget settings"
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="period_start_day"
						select
						label="A period starts on day"
						helperText="Day 1 means calendar months. Pick another day to line periods up with your pay."
					>
						{DAYS.map((d) => (
							<MenuItem key={d} value={d}>
								{d === 1 ? "1 (calendar months)" : d}
							</MenuItem>
						))}
					</FormTextField>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="warn_percent"
						label="Warn at (%)"
						type="number"
						required
						helperText="A line is flagged as close once this share of its limit is spent. A line can set its own."
						slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
