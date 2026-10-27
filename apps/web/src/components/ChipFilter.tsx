import Stack from "@mui/material/Stack";
import { useState } from "react";
import FilterChip from "./FilterChip";

/**
 * A single-choice filter as a row of chips ("All" plus the options), the site's way of filtering a
 * list. Tapping the selected chip again clears it. Rows scroll sideways on a phone.
 */
export default function ChipFilter<T extends string>({
	allLabel,
	value,
	options,
	onChange,
}: {
	allLabel: string;
	value: T | undefined;
	options: readonly { value: T; label: string; symbol?: string; accent?: string }[];
	onChange: (value: T | undefined) => void;
}) {
	// The chip morph starts from local state, not from the URL, and the real change is handed on
	// after the next paint. Otherwise the filter's re-render lands in the same frame as the click
	// and stalls the first frames of the spring.
	const [picked, setPicked] = useState(value);
	const [seen, setSeen] = useState(value);
	if (value !== seen) {
		setSeen(value);
		setPicked(value);
	}
	const pick = (next: T | undefined) => {
		setPicked(next);
		requestAnimationFrame(() => setTimeout(() => onChange(next), 0));
	};

	return (
		<Stack
			direction="row"
			sx={{
				gap: 1,
				overflowX: "auto",
				scrollbarWidth: "none",
				"&::-webkit-scrollbar": { display: "none" },
				py: 0.25,
			}}
		>
			<FilterChip label={allLabel} selected={!picked} onClick={() => pick(undefined)} />
			{options.map((o) => (
				<FilterChip
					key={o.value}
					label={o.label}
					symbol={o.symbol}
					accent={o.accent}
					selected={picked === o.value}
					onClick={() => pick(picked === o.value ? undefined : o.value)}
				/>
			))}
		</Stack>
	);
}
