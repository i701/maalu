import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { addGoalEntryFn, deleteGoalEntryFn } from "#/server/goals";
import type { Goal } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

const SHOWN = 5;

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

/** Set money aside for a goal (or take some back out), with its latest entries below. */
export default function GoalEntryDialog({ goal, onClose }: { goal: Goal; onClose: () => void }) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [direction, setDirection] = useState<"add" | "take">("add");

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const amount = text("amount");
		const ok = await run(() =>
			addGoalEntryFn({
				data: {
					id: goal.id,
					amount: direction === "take" ? `-${amount}` : amount,
					entry_date: text("entry_date") || undefined,
					note: text("note") || undefined,
				},
			}),
		);
		if (ok) {
			notify(direction === "take" ? "Money taken out" : "Money set aside");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`${goal.name}: add or take out`}
			error={error}
			pending={pending}
			onSubmit={submit}
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
						onChange={(_, next: "add" | "take" | null) => next && setDirection(next)}
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
					<TextField
						label={`Amount (${goal.currency})`}
						name="amount"
						required
						autoFocus
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Date"
						name="entry_date"
						type="date"
						defaultValue={today()}
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
				<Grid size={12}>
					<TextField label="Note" name="note" slotProps={{ htmlInput: { maxLength: 200 } }} />
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
				sx={{ fontVariantNumeric: "tabular-nums", color: negative ? "error.main" : "success.main" }}
			>
				{negative ? "" : "+"}
				{formatMoney(entry.amount, goal.currency)}
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
