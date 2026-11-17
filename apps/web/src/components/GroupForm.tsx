import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { groupSchema, updateGroupFn } from "#/server/groups";
import type { TransactionGroup } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(groupSchema),
		defaultValues: { name: group.name, note: group.note ?? "" },
	});

	async function submit(changes: z.output<typeof groupSchema>) {
		if (await run(() => updateGroupFn({ data: { id: group.id, changes } }))) {
			notify("Group saved");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Edit group"
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
			maxWidth="xs"
		>
			<FormTextField
				control={control}
				name="name"
				label="Name"
				required
				autoFocus
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
		</FormDialog>
	);
}
