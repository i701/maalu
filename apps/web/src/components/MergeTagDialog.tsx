import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { mergeTagFn } from "#/server/tags";
import type { Tag } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

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
	const [target, setTarget] = useState("");

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!target) return;
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
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				select
				label="Merge into"
				value={target}
				onChange={(e) => setTarget(e.target.value)}
				required
				autoFocus
				helperText={`Its transactions and templates get that tag instead, then "${tag.name}" is removed`}
			>
				{others.map((t) => (
					<MenuItem key={t.id} value={t.id}>
						{t.name}
					</MenuItem>
				))}
			</TextField>
		</FormDialog>
	);
}
