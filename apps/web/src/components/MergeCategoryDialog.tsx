import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { mergeCategoryFn } from "#/server/categories";
import type { Category } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

const schema = z.object({ into_id: z.string().min(1, "Choose where to merge it") });

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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { into_id: "" },
	});

	async function submit({ into_id: target }: z.output<typeof schema>) {
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
				helperText={`Its transactions, items and subscriptions move there, then "${category.name}" is removed`}
			>
				{others.map((c) => (
					<MenuItem key={c.id} value={c.id}>
						{c.name}
					</MenuItem>
				))}
			</FormTextField>
		</FormDialog>
	);
}
