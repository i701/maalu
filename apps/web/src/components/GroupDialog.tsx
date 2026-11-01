import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useState } from "react";
import { groupedMessage, groupSizeProblem } from "#/lib/groups";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { addToGroupFn, createGroupFn } from "#/server/groups";
import type { TransactionGroup } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

type Mode = "new" | "existing";

/** Puts the selected transactions in a new group, or adds them to one you already have. A group
 * only adds its transactions up: nothing about them changes. */
export default function GroupDialog({
	ids,
	groups,
	onClose,
	onDone,
}: {
	/** The selected transactions, fixed when the dialog opened */
	ids: string[];
	/** Every group, to add to */
	groups: TransactionGroup[];
	onClose: () => void;
	/** After the transactions were grouped (to clear the selection) */
	onDone: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [mode, setMode] = useState<Mode>("new");
	const [target, setTarget] = useState("");
	const [localError, setLocalError] = useState<string | null>(null);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		if (mode === "new") {
			const problem = groupSizeProblem(ids.length);
			if (problem) return setLocalError(problem);
			const name = String(form.get("name") ?? "").trim();
			const note = String(form.get("note") ?? "").trim() || null;
			setLocalError(null);
			if (await run(() => createGroupFn({ data: { name, note, transaction_ids: ids } }))) {
				notify(groupedMessage(ids.length, name, true));
				onDone();
				sheet.close();
			}
			return;
		}
		const group = groups.find((g) => g.id === target);
		if (!group) return setLocalError("Choose a group");
		setLocalError(null);
		if (await run(() => addToGroupFn({ data: { id: group.id, transaction_ids: ids } }))) {
			notify(groupedMessage(ids.length, group.name, false));
			onDone();
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Group transactions"
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
			submitLabel={mode === "new" ? "Make group" : "Add to group"}
		>
			<ToggleButtonGroup
				exclusive
				fullWidth
				size="small"
				value={mode}
				onChange={(_, next: Mode | null) => {
					if (next) {
						setMode(next);
						setLocalError(null);
					}
				}}
				aria-label="New group or existing"
				sx={{ mb: 2 }}
			>
				<ToggleButton value="new">New group</ToggleButton>
				<ToggleButton value="existing" disabled={groups.length === 0}>
					Add to existing
				</ToggleButton>
			</ToggleButtonGroup>
			{mode === "new" ? (
				<>
					<TextField
						label="Name"
						name="name"
						required
						autoFocus
						placeholder="Trip to Colombo, Treatment plan…"
						helperText={`${ids.length} selected. Nothing about them changes: the group adds them up.`}
						slotProps={{ htmlInput: { maxLength: 100 } }}
						sx={{ mb: 2 }}
					/>
					<TextField
						label="Note (optional)"
						name="note"
						multiline
						minRows={2}
						slotProps={{ htmlInput: { maxLength: 500 } }}
					/>
				</>
			) : (
				<TextField
					select
					label="Group"
					value={target}
					onChange={(e) => setTarget(e.target.value)}
					required
					autoFocus
					helperText={`Adds the ${ids.length} selected. A group holds at most 50.`}
				>
					{groups.map((g) => (
						<MenuItem key={g.id} value={g.id}>
							{g.name} ({g.transaction_count})
						</MenuItem>
					))}
				</TextField>
			)}
		</FormDialog>
	);
}
