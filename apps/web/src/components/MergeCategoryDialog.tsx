import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { mergeCategoryFn } from "#/server/categories";
import type { Category } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Moves everything in a category into another one, then removes it: the way to fix duplicates
 * and to retire a category that is still in use. */
export default function MergeCategoryDialog({
	category,
	categories,
	onClose,
}: {
	category: Category;
	/** Every category; the one being merged is left out of the choices */
	categories: Category[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const others = categories.filter((c) => c.id !== category.id);
	const [target, setTarget] = useState("");

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!target) return;
		const ok = await run(() => mergeCategoryFn({ data: { id: category.id, into_id: target } }));
		if (ok) {
			notify(`Merged "${category.name}"`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Merge "${category.name}"`}
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
				helperText={`Its transactions, items and subscriptions move there, then "${category.name}" is removed`}
			>
				{others.map((c) => (
					<MenuItem key={c.id} value={c.id}>
						{c.name}
					</MenuItem>
				))}
			</TextField>
		</FormDialog>
	);
}
