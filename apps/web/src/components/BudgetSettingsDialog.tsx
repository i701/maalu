import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { updateBudgetFn } from "#/server/budget";
import type { Budget } from "#/types/api";
import FormDialog from "./FormDialog";
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

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const ok = await run(() =>
			updateBudgetFn({
				data: {
					period_start_day: Number(f.get("period_start_day")),
					warn_percent: Number(f.get("warn_percent")),
				},
			}),
		);
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
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						select
						label="A period starts on day"
						name="period_start_day"
						defaultValue={budget.period_start_day}
						helperText="Day 1 means calendar months. Pick another day to line periods up with your pay."
					>
						{DAYS.map((d) => (
							<MenuItem key={d} value={d}>
								{d === 1 ? "1 (calendar months)" : d}
							</MenuItem>
						))}
					</TextField>
				</Grid>
				<Grid size={12}>
					<TextField
						label="Warn at (%)"
						name="warn_percent"
						type="number"
						defaultValue={budget.warn_percent}
						required
						helperText="A line is flagged as close once this share of its limit is spent. A line can set its own."
						slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
