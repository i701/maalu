import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Controller } from "react-hook-form";
import type { Category } from "#/types/api";
import type { LimitControl } from "./form";

/** The categories a limit covers; those another limit already holds are shown but can't be picked. */
export default function CategoriesPicker({
	control,
	categories,
	takenBy,
}: {
	control: LimitControl;
	categories: Category[];
	/** Category id to the name of the limit that has it. */
	takenBy: Map<string, string>;
}) {
	return (
		<Controller
			name="category_ids"
			control={control}
			render={({ field, fieldState }) => (
				<Autocomplete
					multiple
					options={categories}
					value={categories.filter((c) => field.value.includes(c.id))}
					onChange={(_, value) => field.onChange(value.map((c) => c.id))}
					getOptionLabel={(c) => c.name}
					getOptionDisabled={(c) => takenBy.has(c.id)}
					isOptionEqualToValue={(a, b) => a.id === b.id}
					noOptionsText="No categories yet. Add one on the Categories page"
					renderOption={({ key, ...props }, c) => (
						<li key={key} {...props}>
							{c.name}
							{takenBy.has(c.id) && (
								<span style={{ marginLeft: 8, opacity: 0.6 }}>in "{takenBy.get(c.id)}"</span>
							)}
						</li>
					)}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Categories"
							error={Boolean(fieldState.error)}
							helperText={
								fieldState.error?.message ?? "Spending in these categories counts against the limit"
							}
						/>
					)}
				/>
			)}
		/>
	);
}
