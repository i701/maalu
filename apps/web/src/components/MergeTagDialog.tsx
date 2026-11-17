import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { mergeTagFn } from "#/server/tags";
import type { Tag } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const schema = z.object({ into_id: z.string().min(1, "Choose where to merge it") });

/** Gives everything with one tag another tag instead, then removes it: the way to fix duplicates. */
export default function MergeTagDialog({
	tag,
	tags,
	onClose,
}: {
	tag: Tag;
	/** Every tag; the one being merged is left out of the choices */
	tags: Tag[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const others = tags.filter((t) => t.id !== tag.id);
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { into_id: "" },
	});

	async function submit({ into_id: target }: z.output<typeof schema>) {
		if (await run(() => mergeTagFn({ data: { id: tag.id, into_id: target } }))) {
			notify(`Merged "${tag.name}"`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Merge "${tag.name}"`}
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<FormTextField
				control={control}
				name="into_id"
				select
				label="Merge into"
				required
				autoFocus
				helperText={`Its transactions and templates get that tag instead, then "${tag.name}" is removed`}
			>
				{others.map((t) => (
					<MenuItem key={t.id} value={t.id}>
						{t.name}
					</MenuItem>
				))}
			</FormTextField>
		</FormDialog>
	);
}
