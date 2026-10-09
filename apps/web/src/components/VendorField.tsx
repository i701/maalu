import AddIcon from "@mui/icons-material/Add";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type { Vendor } from "#/types/api";

type Option = string | { inputValue: string; label: string };

const filter = createFilterOptions<Option>();

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Vendor picker that can also create one inline (MUI "creatable" Autocomplete): type a name and an
 * `Add "Name"` option appears. The vendor itself is created when the parent form is saved (the API
 * finds-or-creates by name), so cancelling the form leaves nothing behind. Name is all a vendor
 * needs; the rest can be filled in later on the Vendors page.
 *
 * Renders an input named `name` whose value is the vendor name ("" when none).
 */
export default function VendorField({
	vendors,
	defaultValue = "",
	name = "vendor",
	label = "Vendor",
}: {
	vendors: Vendor[];
	defaultValue?: string;
	name?: string;
	label?: string;
}) {
	const [text, setText] = useState(defaultValue);
	const names = vendors.map((v) => v.name);
	const typed = text.trim().replace(/\s+/g, " ");
	const isNew = typed !== "" && !names.some((n) => norm(n) === norm(typed));

	return (
		<Autocomplete<Option, false, false, true>
			freeSolo
			autoSelect
			options={names}
			defaultValue={defaultValue}
			onInputChange={(_, value) => setText(value)}
			filterOptions={(options, params) => {
				const filtered = filter(options, params);
				const input = params.inputValue.trim();
				if (
					input !== "" &&
					!options.some((o) => typeof o === "string" && norm(o) === norm(input))
				) {
					filtered.push({ inputValue: input, label: `Add "${input}"` });
				}
				return filtered;
			}}
			getOptionLabel={(option) => (typeof option === "string" ? option : option.inputValue)}
			renderOption={({ key, ...props }, option) => (
				<li key={key} {...props}>
					{typeof option === "string" ? (
						option
					) : (
						<>
							<AddIcon fontSize="small" sx={{ mr: 1, color: "primary.main" }} />
							{option.label}
						</>
					)}
				</li>
			)}
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					name={name}
					helperText={
						isNew
							? `New vendor "${typed}" will be created when you save`
							: "Optional. Pick an existing vendor or type a new name"
					}
					slotProps={{
						...params.slotProps,
						htmlInput: { ...params.slotProps.htmlInput, maxLength: 200 },
						formHelperText: { sx: isNew ? { color: "primary.main" } : undefined },
					}}
				/>
			)}
		/>
	);
}
