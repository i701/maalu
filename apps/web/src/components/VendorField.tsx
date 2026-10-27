import type { Vendor } from "#/types/api";
import NamePickerField from "./NamePickerField";

/** Vendor picker that can also create one inline: type a name and an `Add "Name"` option appears.
 * Name is all a vendor needs; the rest can be filled in later on the Vendors page. */
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
	return (
		<NamePickerField
			names={vendors.map((v) => v.name)}
			noun="vendor"
			label={label}
			name={name}
			defaultValue={defaultValue}
			maxLength={200}
		/>
	);
}
