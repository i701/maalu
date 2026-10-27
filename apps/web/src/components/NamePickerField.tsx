import AddIcon from "@mui/icons-material/Add";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useState } from "react";

type Option = string | { inputValue: string; label: string };

const filter = createFilterOptions<Option>();

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * A picker for a named record that can also create one inline (MUI "creatable" Autocomplete): type
 * a name and an `Add "Name"` option appears. The record itself is created when the parent form is
 * saved (the API finds-or-creates by name, ignoring case), so cancelling the form leaves nothing
 * behind. Used for vendors and categories.
 *
 * Renders an input named `name` whose value is the typed or picked name ("" when none).
 */
export default function NamePickerField({
	names,
	noun,
	label,
	name,
	defaultValue = "",
	required = false,
	maxLength,
	helper = true,
	onValueChange,
}: {
	/** Existing names to pick from */
	names: string[];
	/** What the names are, for the helper text: "vendor", "category" */
	noun: string;
	label: string;
	name?: string;
	defaultValue?: string;
	required?: boolean;
	maxLength: number;
	/** Show the helper line under the input; off in tight spaces such as table rows */
	helper?: boolean;
	onValueChange?: (value: string) => void;
}) {
	const [text, setText] = useState(defaultValue);
	const typed = text.trim().replace(/\s+/g, " ");
	const isNew = typed !== "" && !names.some((n) => norm(n) === norm(typed));

	return (
		<Autocomplete<Option, false, false, true>
			freeSolo
			autoSelect
			options={names}
			defaultValue={defaultValue}
			onInputChange={(_, value) => {
				setText(value);
				onValueChange?.(value);
			}}
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
					required={required}
					helperText={
						helper
							? isNew
								? `New ${noun} "${typed}" will be created when you save`
								: required
									? `Pick an existing ${noun} or type a new name`
									: `Optional. Pick an existing ${noun} or type a new name`
							: undefined
					}
					slotProps={{
						...params.slotProps,
						htmlInput: { ...params.slotProps.htmlInput, maxLength },
						formHelperText: { sx: isNew ? { color: "primary.main" } : undefined },
					}}
				/>
			)}
		/>
	);
}
