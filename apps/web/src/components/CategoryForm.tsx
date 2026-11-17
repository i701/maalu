import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ACCENT_NAMES, parentChoices } from "#/lib/categories";
import { isAccent } from "#/lib/m3";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createCategoryFn, updateCategoryFn } from "#/server/categories";
import { CATEGORY_KIND_LABELS, CATEGORY_KINDS, type Category } from "#/types/api";
import ColorSwatches from "./ColorSwatches";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

// "" means: no colour chosen (the API picks the least used one), no parent, not sorted.
const schema = z.object({
	name: z.string().trim().min(1, "Give the category a name").max(100),
	color: z.enum(ACCENT_NAMES).or(z.literal("")),
	parent_id: z.string(),
	kind: z.enum(CATEGORY_KINDS).or(z.literal("")),
});

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
	const parents = parentChoices(categories, category);
	const startColor = category?.color;
	const { control, handleSubmit } = useForm<
		z.input<typeof schema>,
		unknown,
		z.output<typeof schema>
	>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: category?.name ?? "",
			color: isAccent(startColor) ? startColor : "",
			parent_id: category?.parent_id ?? "",
			kind: category?.kind ?? "",
		},
	});

	async function submit({ name, color, parent_id, kind }: z.output<typeof schema>) {
		const fields = {
			name: category?.is_salary ? category.name : name,
			...(color ? { color } : {}),
			parent_id: parent_id || null,
			kind: kind || null,
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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<Stack spacing={2.5}>
				<FormTextField
					control={control}
					name="name"
					fullWidth
					label="Name"
					required
					autoFocus
					disabled={category?.is_salary}
					helperText={
						category?.is_salary
							? "The default category for pay: it keeps its name"
							: category
								? "Everything in this category is renamed with it"
								: undefined
					}
					slotProps={{ htmlInput: { maxLength: 100 } }}
				/>
				<Controller
					name="color"
					control={control}
					render={({ field }) => <ColorSwatches value={field.value} onChange={field.onChange} />}
				/>
				<FormTextField
					control={control}
					name="parent_id"
					select
					fullWidth
					label="Parent category"
					disabled={parents.length === 0 || category?.is_salary}
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
				</FormTextField>
				<FormTextField
					control={control}
					name="kind"
					select
					fullWidth
					label="Need or want"
					helperText="Spending here counts as a need or a want in your reports. A sub-category with none takes its parent's"
				>
					<MenuItem value="">Not sorted</MenuItem>
					{CATEGORY_KINDS.map((k) => (
						<MenuItem key={k} value={k}>
							{CATEGORY_KIND_LABELS[k]}
						</MenuItem>
					))}
				</FormTextField>
			</Stack>
		</FormDialog>
	);
}
