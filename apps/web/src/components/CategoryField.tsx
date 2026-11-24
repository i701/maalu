import type { Category } from "#/types/api";
import NamePickerField from "./NamePickerField";

/** Category picker (autocomplete of your categories) that can also create one inline. */
export default function CategoryField({
	categories,
	defaultValue = "",
	label = "Category",
	required = true,
	helper = true,
	dense = false,
	onValueChange,
	error,
}: {
	categories: Category[];
	defaultValue?: string;
	label?: string;
	required?: boolean;
	helper?: boolean;
	/** A compact field for a table cell */
	dense?: boolean;
	onValueChange?: (value: string, fromUser: boolean) => void;
	/** A message from the form's schema, shown under the field. */
	error?: string;
}) {
	return (
		<NamePickerField
			names={categories.map((c) => c.name)}
			meta={Object.fromEntries(
				categories.map((c) => [c.name, { color: c.color, parent: c.parent ?? null }]),
			)}
			noun="category"
			label={label}
			defaultValue={defaultValue}
			required={required}
			helper={helper}
			dense={dense}
			maxLength={100}
			onValueChange={onValueChange}
			error={error}
		/>
	);
}
