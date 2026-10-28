import TextField from "@mui/material/TextField";
import { type FormEvent, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createTemplateFn, type TemplateDraft } from "#/server/templates";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Asks for a name and saves what is in the transaction form as a template. `build` turns the name
 * into the request, or a message when the form lacks something a template needs. */
export default function SaveTemplateDialog({
	build,
	onClose,
}: {
	build: (name: string) => { error: string } | { draft: TemplateDraft };
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
		const built = build(name);
		if ("error" in built) return setLocalError(built.error);
		setLocalError(null);
		if (await run(() => createTemplateFn({ data: built.draft }))) {
			notify(`Template "${name}" saved`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Save as template"
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Template name"
				name="name"
				required
				autoFocus
				slotProps={{ htmlInput: { maxLength: 200 } }}
				helperText="Fills in the account, category, vendor, method and amount (if you typed one)"
			/>
		</FormDialog>
	);
}
