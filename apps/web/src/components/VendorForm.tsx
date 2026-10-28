import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createVendorFn, updateVendorFn } from "#/server/vendors";
import type { Category, Tag, Vendor } from "#/types/api";
import CategoryField from "./CategoryField";
import CurrencyField from "./CurrencyField";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import TagsField from "./TagsField";

export default function VendorForm({
	vendor,
	currencies,
	categories,
	tags,
	onClose,
}: {
	/** undefined = create a new vendor */
	vendor?: Vendor;
	currencies: string[];
	/** Every category and tag, to pick the defaults from. */
	categories: Category[];
	tags: Tag[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const local = text("is_local");

		const fields = {
			name: text("name"),
			address: text("address") || null,
			is_local: local === "" ? null : local === "true",
			currency: text("currency") ? text("currency").toUpperCase() : null,
			contact: text("contact") || null,
			default_category: text("default_category") || null,
			default_tags: f.getAll("default_tags").map(String),
		};

		const ok = await run(() =>
			vendor
				? updateVendorFn({ data: { id: vendor.id, changes: fields } })
				: createVendorFn({ data: fields }),
		);
		if (ok) {
			notify(vendor ? "Vendor updated" : "Vendor added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={vendor ? "Edit vendor" : "Add vendor"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Name"
						name="name"
						defaultValue={vendor?.name}
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						select
						label="Local or foreign"
						name="is_local"
						defaultValue={vendor?.is_local == null ? "" : String(vendor.is_local)}
					>
						<MenuItem value="">Unknown</MenuItem>
						<MenuItem value="true">Local</MenuItem>
						<MenuItem value="false">Foreign</MenuItem>
					</TextField>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<CurrencyField
						name="currency"
						label="Usual currency"
						currencies={currencies}
						defaultValue={vendor?.currency ?? ""}
						helperText="Optional"
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<CategoryField
						categories={categories}
						name="default_category"
						label="Usual category"
						required={false}
						defaultValue={vendor?.default_category ?? ""}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TagsField
						tags={tags}
						name="default_tags"
						label="Usual tags"
						defaultValue={vendor?.default_tags.map((t) => t.name) ?? []}
					/>
				</Grid>
				<Grid size={12}>
					<TextField
						label="Contact"
						name="contact"
						defaultValue={vendor?.contact ?? ""}
						placeholder="Phone, email, contact person…"
						slotProps={{ htmlInput: { maxLength: 255 } }}
					/>
				</Grid>
				<Grid size={12}>
					<TextField
						label="Address"
						name="address"
						defaultValue={vendor?.address ?? ""}
						multiline
						minRows={2}
						slotProps={{ htmlInput: { maxLength: 500 } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
