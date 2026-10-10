import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 400;
const DECIMAL = /^\d+(\.\d{1,4})?$/;

type Range = { min?: string; max?: string };

/**
 * Min / max amount inputs. Applies the range after you pause typing, and only while both values
 * are valid numbers with min <= max. Amounts stay strings end to end (no float rounding).
 */
export default function AmountRangeField({
	value,
	onChange,
	currency,
}: {
	value: Range;
	onChange: (range: Range) => void;
	currency: string;
}) {
	const [min, setMin] = useState(value.min ?? "");
	const [max, setMax] = useState(value.max ?? "");

	// Follow external changes (e.g. "Clear all") without fighting what the user is typing.
	const [seen, setSeen] = useState(`${value.min ?? ""}|${value.max ?? ""}`);
	const incoming = `${value.min ?? ""}|${value.max ?? ""}`;
	if (incoming !== seen) {
		setSeen(incoming);
		setMin(value.min ?? "");
		setMax(value.max ?? "");
	}

	const minBad = min !== "" && !DECIMAL.test(min);
	const maxBad = max !== "" && !DECIMAL.test(max);
	const backwards = !minBad && !maxBad && min !== "" && max !== "" && Number(min) > Number(max);
	const invalid = minBad || maxBad || backwards;

	useEffect(() => {
		if (invalid) return;
		const next = { min: min || undefined, max: max || undefined };
		if (next.min === value.min && next.max === value.max) return;
		const timer = setTimeout(() => onChange(next), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [min, max, invalid, value.min, value.max, onChange]);

	return (
		<Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
			<TextField
				size="small"
				label="Min"
				value={min}
				onChange={(e) => setMin(e.target.value.trim())}
				error={minBad || backwards}
				helperText={minBad ? "Enter a number" : backwards ? "Higher than max" : undefined}
				placeholder="0"
				slotProps={{
					htmlInput: { inputMode: "decimal", "aria-label": `Minimum amount in ${currency}` },
				}}
			/>
			<TextField
				size="small"
				label="Max"
				value={max}
				onChange={(e) => setMax(e.target.value.trim())}
				error={maxBad || backwards}
				helperText={maxBad ? "Enter a number" : undefined}
				placeholder="Any"
				slotProps={{
					htmlInput: { inputMode: "decimal", "aria-label": `Maximum amount in ${currency}` },
				}}
			/>
		</Stack>
	);
}
