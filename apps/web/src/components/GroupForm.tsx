import TextField from "@mui/material/TextField";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { updateGroupFn } from "#/server/groups";
import type { TransactionGroup } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Rename a group or change its note. */
export default function GroupForm({
	group,
	onClose,
}: {
	group: TransactionGroup;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const name = String(f.get("name") ?? "").trim();
		const note = String(f.get("note") ?? "").trim() || null;
		if (await run(() => updateGroupFn({ data: { id: group.id, changes: { name, note } } }))) {
			notify("Group saved");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Edit group"
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Name"
				name="name"
				defaultValue={group.name}
				required
				autoFocus
				slotProps={{ htmlInput: { maxLength: 100 } }}
				sx={{ mb: 2 }}
			/>
			<TextField
				label="Note (optional)"
				name="note"
				defaultValue={group.note ?? ""}
				multiline
				minRows={2}
				slotProps={{ htmlInput: { maxLength: 500 } }}
			/>
		</FormDialog>
	);
}
