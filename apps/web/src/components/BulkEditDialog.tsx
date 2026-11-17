import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { bulkMessage, transactionCount } from "#/lib/bulk-message";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { bulkUpdateFn } from "#/server/transactions";
import {
	type BulkResult,
	type Category,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	type Tag,
	type Vendor,
} from "#/types/api";
import CategoryField from "./CategoryField";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";
import TagsField from "./TagsField";
import VendorField from "./VendorField";

// Every field is optional: blank or empty leaves that thing as it is.
const blank = z
	.string()
	.trim()
	.transform((v) => v || undefined);
const tagList = z
	.array(z.string())
	.max(10)
	.transform((v) => (v.length > 0 ? v : undefined));
const schema = z.object({
	category: blank,
	vendor_name: blank,
	payment_method: z
		.enum(PAYMENT_METHODS)
		.or(z.literal(""))
		.transform((v) => v || undefined),
	add_tags: tagList,
	remove_tags: tagList,
});

/** Change the same things on every selected transaction. Leave a field empty to leave that thing
 * as it is; what does not fit a transaction (a category on a transfer) is skipped and reported. */
export default function BulkEditDialog({
	ids,
	categories,
	vendors,
	tags,
	onClose,
	onDone,
}: {
	ids: string[];
	categories: Category[];
	vendors: Vendor[];
	tags: Tag[];
	onClose: () => void;
	/** After the change went through: the caller clears the selection. */
	onDone: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);

	const { control, handleSubmit } = useForm<
		z.input<typeof schema>,
		unknown,
		z.output<typeof schema>
	>({
		resolver: zodResolver(schema),
		defaultValues: {
			category: "",
			vendor_name: "",
			payment_method: "",
			add_tags: [],
			remove_tags: [],
		},
	});

	async function submit(change: z.output<typeof schema>) {
		if (!Object.values(change).some(Boolean)) return setLocalError("Choose something to change");
		setLocalError(null);

		let result: BulkResult | undefined;
		const ok = await run(async () => {
			const res = await bulkUpdateFn({ data: { ids, ...change } });
			if (res.ok) result = res.data;
			return res;
		});
		if (ok && result) {
			const message = bulkMessage((n) => `Updated ${transactionCount(n)}`, result);
			notify(message.text, message.severity);
			onDone();
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Edit ${transactionCount(ids.length)}`}
			error={localError ?? error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<Controller
						name="category"
						control={control}
						render={({ field, fieldState }) => (
							<CategoryField
								categories={categories}
								label="Set category"
								required={false}
								helper={false}
								onValueChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<Controller
						name="vendor_name"
						control={control}
						render={({ field, fieldState }) => (
							<VendorField
								vendors={vendors}
								label="Set vendor"
								onValueChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="payment_method"
						select
						label="Set payment method"
						helperText="Leave empty to keep each one's own"
					>
						<MenuItem value="">Don't change</MenuItem>
						{PAYMENT_METHODS.map((m) => (
							<MenuItem key={m} value={m}>
								{PAYMENT_METHOD_LABELS[m]}
							</MenuItem>
						))}
					</FormTextField>
				</Grid>
				<Grid size={12}>
					<Controller
						name="add_tags"
						control={control}
						render={({ field }) => (
							<TagsField tags={tags} label="Add tags" onChange={field.onChange} />
						)}
					/>
				</Grid>
				<Grid size={12}>
					<Controller
						name="remove_tags"
						control={control}
						render={({ field }) => (
							<TagsField tags={tags} label="Remove tags" onChange={field.onChange} />
						)}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
