import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { groupedMessage, groupSizeProblem } from "#/lib/groups";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { addToGroupFn, createGroupFn, groupSchema } from "#/server/groups";
import type { TransactionGroup } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const schema = z.discriminatedUnion("mode", [
	groupSchema.extend({ mode: z.literal("new") }),
	z.object({ mode: z.literal("existing"), target: z.string().min(1, "Choose a group") }),
]);

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
	const [localError, setLocalError] = useState<string | null>(null);
	const { control, handleSubmit, reset } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { mode: "new", name: "", note: "" },
	});
	const mode = useWatch({ control, name: "mode" });

	function switchMode(next: z.input<typeof schema>["mode"] | null) {
		if (!next) return;
		reset(next === "new" ? { mode: next, name: "", note: "" } : { mode: next, target: "" });
		setLocalError(null);
	}

	async function submit(values: z.output<typeof schema>) {
		if (values.mode === "new") {
			const problem = groupSizeProblem(ids.length);
			if (problem) return setLocalError(problem);
			const { name, note } = values;
			setLocalError(null);
			if (await run(() => createGroupFn({ data: { name, note, transaction_ids: ids } }))) {
				notify(groupedMessage(ids.length, name, true));
				onDone();
				sheet.close();
			}
			return;
		}
		const group = groups.find((g) => g.id === values.target);
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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
			submitLabel={mode === "new" ? "Make group" : "Add to group"}
		>
			<ToggleButtonGroup
				exclusive
				fullWidth
				size="small"
				value={mode}
				onChange={(_, next: z.input<typeof schema>["mode"] | null) => switchMode(next)}
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
					<FormTextField
						control={control}
						name="name"
						label="Name"
						required
						autoFocus
						placeholder="Trip to Colombo, Treatment plan…"
						helperText={`${ids.length} selected. Nothing about them changes: the group adds them up.`}
						slotProps={{ htmlInput: { maxLength: 100 } }}
						sx={{ mb: 2 }}
					/>
					<FormTextField
						control={control}
						name="note"
						label="Note (optional)"
						multiline
						minRows={2}
						slotProps={{ htmlInput: { maxLength: 500 } }}
					/>
				</>
			) : (
				<FormTextField
					control={control}
					name="target"
					select
					label="Group"
					required
					autoFocus
					helperText={`Adds the ${ids.length} selected. A group holds at most 50.`}
				>
					{groups.map((g) => (
						<MenuItem key={g.id} value={g.id}>
							{g.name} ({g.transaction_count})
						</MenuItem>
					))}
				</FormTextField>
			)}
		</FormDialog>
	);
}
