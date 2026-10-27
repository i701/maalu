import TextField from "@mui/material/TextField";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createCategoryFn, renameCategoryFn } from "#/server/categories";
import type { Category } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** Add a category, or rename one (every transaction, item and subscription in it follows). */
export default function CategoryForm({
	category,
	onClose,
}: {
	/** undefined = create a new category */
	category?: Category;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
		const ok = await run(() =>
			category
				? renameCategoryFn({ data: { id: category.id, name } })
				: createCategoryFn({ data: { name } }),
		);
		if (ok) {
			notify(category ? "Category renamed" : "Category added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={category ? "Rename category" : "Add category"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Name"
				name="name"
				defaultValue={category?.name}
				required
				autoFocus
				helperText={category ? "Everything in this category is renamed with it" : undefined}
				slotProps={{ htmlInput: { maxLength: 100 } }}
			/>
		</FormDialog>
	);
}
