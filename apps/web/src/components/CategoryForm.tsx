import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { parentChoices } from "#/lib/categories";
import type { Accent } from "#/lib/m3";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createCategoryFn, updateCategoryFn } from "#/server/categories";
import type { Category } from "#/types/api";
import ColorSwatches from "./ColorSwatches";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Add a category, or change one: its name (everything in it follows), colour and parent. */
export default function CategoryForm({
	category,
	categories,
	onClose,
}: {
	/** undefined = create a new category */
	category?: Category;
	/** Every category, for the parent choices */
	categories: Category[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	// Empty = let the API pick the least used colour (new categories only)
	const [color, setColor] = useState(category?.color ?? "");
	const [parentId, setParentId] = useState(category?.parent_id ?? "");
	const parents = parentChoices(categories, category);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
		const fields = {
			name,
			...(color ? { color: color as Accent } : {}),
			parent_id: parentId || null,
		};
		const ok = await run(() =>
			category
				? updateCategoryFn({ data: { id: category.id, ...fields } })
				: createCategoryFn({ data: fields }),
		);
		if (ok) {
			notify(category ? "Category saved" : "Category added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={category ? "Edit category" : "Add category"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Stack spacing={2.5}>
				<TextField
					fullWidth
					label="Name"
					name="name"
					defaultValue={category?.name}
					required
					autoFocus
					helperText={category ? "Everything in this category is renamed with it" : undefined}
					slotProps={{ htmlInput: { maxLength: 100 } }}
				/>
				<ColorSwatches value={color} onChange={setColor} />
				<TextField
					select
					fullWidth
					label="Parent category"
					value={parentId}
					onChange={(e) => setParentId(e.target.value)}
					disabled={parents.length === 0}
					helperText={
						category && category.child_count > 0
							? "Has sub-categories, so it stays at the top"
							: "A parent's totals and budget limits include its sub-categories"
					}
				>
					<MenuItem value="">None (top level)</MenuItem>
					{parents.map((p) => (
						<MenuItem key={p.id} value={p.id}>
							{p.name}
						</MenuItem>
					))}
				</TextField>
			</Stack>
		</FormDialog>
	);
}
