import { type ComponentProps, useState } from "react";
import RateField from "../RateField";

/** shortcut: the rate as a named input for the transaction form, which still reads FormData;
 * remove it when that form moves to react-hook-form and binds RateField to its control. */
export default function NamedRateField({
	initial,
	...props
}: Omit<ComponentProps<typeof RateField>, "value" | "onChange" | "name"> & { initial: string }) {
	const [rate, setRate] = useState(initial);
	return <RateField {...props} name="exchange_rate" value={rate} onChange={setRate} />;
}
