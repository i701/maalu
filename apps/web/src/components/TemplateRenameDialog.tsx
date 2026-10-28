import TextField from "@mui/material/TextField";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { renameTemplateFn } from "#/server/templates";
import type { TransactionTemplate } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

export default function TemplateRenameDialog({
	template,
	onClose,
}: {
	template: TransactionTemplate;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
		if (await run(() => renameTemplateFn({ data: { id: template.id, name } }))) {
			notify("Template renamed");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Rename template"
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Name"
				name="name"
				defaultValue={template.name}
				required
				autoFocus
				slotProps={{ htmlInput: { maxLength: 200 } }}
				helperText="To change what it fills in, delete it and save it again from the form"
			/>
		</FormDialog>
	);
}
