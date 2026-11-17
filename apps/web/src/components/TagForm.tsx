import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createTagFn, renameTagFn, tagSchema } from "#/server/tags";
import type { Tag } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

/** Add a tag, or rename one (every transaction and template with it follows). */
export default function TagForm({ tag, onClose }: { tag?: Tag; onClose: () => void }) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(tagSchema),
		defaultValues: { name: tag?.name ?? "" },
	});

	async function submit({ name }: z.output<typeof tagSchema>) {
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
				helperText={tag ? "Everything with this tag is renamed with it" : undefined}
				slotProps={{ htmlInput: { maxLength: 50 } }}
			/>
		</FormDialog>
	);
}
