import AddIcon from "@mui/icons-material/Add";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import CategoryDot from "./CategoryDot";

/** What the list shows beside a name: a colour dot, and the parent when it is a sub-category. */
export type OptionMeta = { color: string; parent: string | null };

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
	meta,
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
	/** Per name (same order as `names`): shows sub-categories indented under their parent */
	meta?: Record<string, OptionMeta>;
	/** What the names are, for the helper text: "vendor", "category" */
	noun: string;
	label: string;
	name?: string;
	defaultValue?: string;
	required?: boolean;
	maxLength: number;
	/** Show the helper line under the input; off in tight spaces such as table rows */
	helper?: boolean;
	/** `fromUser` is false when the field sets its own starting value (no event behind it). */
	onValueChange?: (value: string, fromUser: boolean) => void;
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
			onInputChange={(event, value) => {
				setText(value);
				onValueChange?.(value, Boolean(event));
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
						<NameOption name={option} meta={meta?.[option]} />
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

/** One existing name: a sub-category is indented, with its parent after it so a search hit still
 * says where it belongs. */
function NameOption({ name, meta }: { name: string; meta?: OptionMeta }) {
	if (!meta) return name;
	return (
		<span
			style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: meta.parent ? 16 : 0 }}
		>
			<CategoryDot color={meta.color} />
			{name}
			{meta.parent && <span style={{ fontSize: 12, opacity: 0.6 }}>in {meta.parent}</span>}
		</span>
	);
}
