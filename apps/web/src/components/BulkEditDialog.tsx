import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { type FormEvent, useState } from "react";
import { bulkMessage, transactionCount } from "#/lib/bulk-message";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { bulkUpdateFn } from "#/server/transactions";
import {
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	type BulkResult,
	type Category,
	type PaymentMethod,
	type Tag,
	type Vendor,
} from "#/types/api";
import CategoryField from "./CategoryField";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import TagsField from "./TagsField";
import VendorField from "./VendorField";

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

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const names = (k: string) => f.getAll(k).map(String);
		const change = {
			category: text("category") || undefined,
			vendor_name: text("vendor") || undefined,
			payment_method: (text("payment_method") || undefined) as PaymentMethod | undefined,
			add_tags: names("add_tags").length > 0 ? names("add_tags") : undefined,
			remove_tags: names("remove_tags").length > 0 ? names("remove_tags") : undefined,
		};
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
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<CategoryField
						categories={categories}
						name="category"
						label="Set category"
						required={false}
						helper={false}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<VendorField vendors={vendors} label="Set vendor" />
				</Grid>
				<Grid size={12}>
					<TextField
						select
						label="Set payment method"
						name="payment_method"
						defaultValue=""
						helperText="Leave empty to keep each one's own"
					>
						<MenuItem value="">Don't change</MenuItem>
						{PAYMENT_METHODS.map((m) => (
							<MenuItem key={m} value={m}>
								{PAYMENT_METHOD_LABELS[m]}
							</MenuItem>
						))}
					</TextField>
				</Grid>
				<Grid size={12}>
					<TagsField tags={tags} name="add_tags" label="Add tags" />
				</Grid>
				<Grid size={12}>
					<TagsField tags={tags} name="remove_tags" label="Remove tags" />
				</Grid>
			</Grid>
		</FormDialog>
	);
}
