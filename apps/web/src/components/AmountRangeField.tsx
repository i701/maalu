import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useEffectEvent, useState } from "react";

const DEBOUNCE_MS = 400;
const DECIMAL = /^\d+(\.\d{1,4})?$/;

type Range = { min?: string; max?: string };

/** What's wrong with a typed min/max pair, if anything. Amounts stay strings (no float rounding). */
function check(min: string, max: string) {
	const minBad = min !== "" && !DECIMAL.test(min);
	const maxBad = max !== "" && !DECIMAL.test(max);
	const backwards = !minBad && !maxBad && min !== "" && max !== "" && Number(min) > Number(max);
	return { minBad, maxBad, backwards, invalid: minBad || maxBad || backwards };
}

/**
 * Min / max amount inputs. Applies the range after you pause typing, and only while both values
 * are valid numbers with min <= max.
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
	const incoming = `${value.min ?? ""}|${value.max ?? ""}`;
	const [seen, setSeen] = useState(incoming);
	if (incoming !== seen) {
		setSeen(incoming);
		setMin(value.min ?? "");
		setMax(value.max ?? "");
	}

	const { minBad, maxBad, backwards, invalid } = check(min, max);

	// Always the latest onChange / committed value, without restarting the debounce when they change.
	const report = useEffectEvent((next: Range) => {
		if (next.min !== value.min || next.max !== value.max) onChange(next);
	});

	useEffect(() => {
		if (invalid) return;
		const timer = setTimeout(
			() => report({ min: min || undefined, max: max || undefined }),
			DEBOUNCE_MS,
		);
		return () => clearTimeout(timer);
	}, [min, max, invalid]);

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
