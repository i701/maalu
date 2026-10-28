import TextField from "@mui/material/TextField";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createTagFn, renameTagFn } from "#/server/tags";
import type { Tag } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Add a tag, or rename one (every transaction and template with it follows). */
export default function TagForm({ tag, onClose }: { tag?: Tag; onClose: () => void }) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
		const ok = await run(() =>
			tag ? renameTagFn({ data: { id: tag.id, name } }) : createTagFn({ data: { name } }),
		);
		if (ok) {
			notify(tag ? "Tag renamed" : "Tag added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={tag ? "Rename tag" : "Add tag"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Name"
				name="name"
				defaultValue={tag?.name}
				required
				autoFocus
				helperText={tag ? "Everything with this tag is renamed with it" : undefined}
				slotProps={{ htmlInput: { maxLength: 50 } }}
			/>
		</FormDialog>
	);
}
