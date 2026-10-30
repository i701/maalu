import type { Category } from "#/types/api";
import NamePickerField from "./NamePickerField";

/** Category picker (autocomplete of your categories) that can also create one inline. Renders an
 * input named `name` (default "category"). */
export default function CategoryField({
	categories,
	defaultValue = "",
	name,
	label = "Category",
	required = true,
	helper = true,
	onValueChange,
}: {
	categories: Category[];
	defaultValue?: string;
	name?: string;
	label?: string;
	required?: boolean;
	helper?: boolean;
	onValueChange?: (value: string, fromUser: boolean) => void;
}) {
	return (
		<NamePickerField
			names={categories.map((c) => c.name)}
			meta={Object.fromEntries(
				categories.map((c) => [c.name, { color: c.color, parent: c.parent ?? null }]),
			)}
			noun="category"
			label={label}
			name={name}
			defaultValue={defaultValue}
			required={required}
			helper={helper}
			maxLength={100}
			onValueChange={onValueChange}
		/>
	);
}
