import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { placeOf, placePayload, placeValueSchema } from "#/lib/places";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createVendorFn, updateVendorFn } from "#/server/vendors";
import type { Category, Tag, Vendor } from "#/types/api";
import CategoryField from "./CategoryField";
import CurrencyField from "./CurrencyField";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import LocationField from "./LocationField";
import { useNotify } from "./Notify";
import TagsField from "./TagsField";

const blankIsNull = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((v) => v || null);

const schema = z.object({
	name: z.string().trim().min(1, "Give the vendor a name").max(200),
	is_local: z.enum(["", "true", "false"]).transform((v) => (v === "" ? null : v === "true")),
	currency: z
		.string()
		.trim()
		.regex(/^([A-Za-z]{3})?$/, "Use a 3-letter currency code")
		.transform((v) => v.toUpperCase() || null),
	default_category: blankIsNull(100),
	default_tags: z.array(z.string()).max(10),
	contact: blankIsNull(255),
	address: blankIsNull(500),
	location: placeValueSchema.nullable(),
});

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
	const { control, handleSubmit } = useForm<
		z.input<typeof schema>,
		unknown,
		z.output<typeof schema>
	>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: vendor?.name ?? "",
			is_local: vendor?.is_local == null ? "" : vendor.is_local ? "true" : "false",
			currency: vendor?.currency ?? "",
			default_category: vendor?.default_category ?? "",
			default_tags: vendor?.default_tags.map((t) => t.name) ?? [],
			contact: vendor?.contact ?? "",
			address: vendor?.address ?? "",
			location: vendor ? placeOf(vendor) : null,
		},
	});

	async function submit({ location, ...rest }: z.output<typeof schema>) {
		const fields = { ...rest, ...placePayload(location) };
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
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="name"
						label="Name"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField control={control} name="is_local" select label="Local or foreign">
						<MenuItem value="">Unknown</MenuItem>
						<MenuItem value="true">Local</MenuItem>
						<MenuItem value="false">Foreign</MenuItem>
					</FormTextField>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<Controller
						name="currency"
						control={control}
						render={({ field, fieldState }) => (
							<CurrencyField
								label="Usual currency"
								currencies={currencies}
								defaultValue={field.value}
								onInputChange={field.onChange}
								error={fieldState.error?.message}
								helperText="Optional"
							/>
						)}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<Controller
						name="default_category"
						control={control}
						render={({ field, fieldState }) => (
							<CategoryField
								categories={categories}
								label="Usual category"
								required={false}
								defaultValue={field.value}
								onValueChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<Controller
						name="default_tags"
						control={control}
						render={({ field, fieldState }) => (
							<TagsField
								tags={tags}
								label="Usual tags"
								defaultValue={field.value}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="contact"
						label="Contact"
						placeholder="Phone, email, contact person…"
						slotProps={{ htmlInput: { maxLength: 255 } }}
					/>
				</Grid>
				<Grid size={12}>
					<Controller
						name="location"
						control={control}
						render={({ field }) => (
							<LocationField
								value={field.value}
								onChange={field.onChange}
								title="Where it usually is"
							/>
						)}
					/>
				</Grid>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="address"
						label="Address"
						multiline
						minRows={2}
						slotProps={{ htmlInput: { maxLength: 500 } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
