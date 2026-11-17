import { zodResolver } from "@hookform/resolvers/zod";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Money from "#/components/Money";
import { formatDate } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { addGoalEntryFn, deleteGoalEntryFn, money } from "#/server/goals";
import type { Goal } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const SHOWN = 5;

const schema = z.object({
	direction: z.enum(["add", "take"]),
	amount: money,
	entry_date: z.iso
		.date()
		.or(z.literal(""))
		.transform((v) => v || undefined),
	note: z
		.string()
		.trim()
		.max(200)
		.transform((v) => v || undefined),
});

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

/** Set money aside for a goal (or take some back out), with its latest entries below. */
export default function GoalEntryDialog({ goal, onClose }: { goal: Goal; onClose: () => void }) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const { control, handleSubmit, setValue } = useForm<
		z.input<typeof schema>,
		unknown,
		z.output<typeof schema>
	>({
		resolver: zodResolver(schema),
		defaultValues: { direction: "add", amount: "", entry_date: today(), note: "" },
	});
	const direction = useWatch({ control, name: "direction" });

	async function submit({ direction: way, amount, entry_date, note }: z.output<typeof schema>) {
		const ok = await run(() =>
			addGoalEntryFn({
				data: {
					id: goal.id,
					amount: way === "take" ? `-${amount}` : amount,
					entry_date,
					note,
				},
			}),
		);
		if (ok) {
			notify(way === "take" ? "Money taken out" : "Money set aside");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`${goal.name}: add or take out`}
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<ToggleButtonGroup
						exclusive
						fullWidth
						size="small"
						value={direction}
						onChange={(_, next: typeof direction | null) => next && setValue("direction", next)}
						aria-label="Add or take out"
					>
						<ToggleButton value="add" color="success" sx={{ py: 1 }}>
							Set aside
						</ToggleButton>
						<ToggleButton value="take" color="error" sx={{ py: 1 }}>
							Take out
						</ToggleButton>
					</ToggleButtonGroup>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="amount"
						label={`Amount (${goal.currency})`}
						required
						autoFocus
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="entry_date"
						label="Date"
						type="date"
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="note"
						label="Note"
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				{goal.entries.length > 0 && (
					<Grid size={12}>
						<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
							Latest
						</Typography>
						{goal.entries.slice(0, SHOWN).map((entry) => (
							<EntryRow key={entry.id} goal={goal} entry={entry} />
						))}
					</Grid>
				)}
			</Grid>
		</FormDialog>
	);
}

function EntryRow({ goal, entry }: { goal: Goal; entry: Goal["entries"][number] }) {
	const { run, pending } = useAction();
	const negative = entry.amount.startsWith("-");
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
			<Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
				{formatDate(entry.entry_date)}
				{entry.note ? ` · ${entry.note}` : ""}
			</Typography>
			<Typography
				variant="body2"
				sx={{
					fontVariantNumeric: "tabular-nums",
					color: negative ? "error.main" : "success.main",
				}}
			>
				{negative ? "" : "+"}
				<Money amount={entry.amount} currency={goal.currency} />
			</Typography>
			<IconButton
				aria-label="Remove entry"
				size="small"
				disabled={pending}
				onClick={() => run(() => deleteGoalEntryFn({ data: { id: goal.id, entry_id: entry.id } }))}
			>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</Box>
	);
}
