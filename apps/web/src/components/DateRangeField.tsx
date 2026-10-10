import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";

type Range = { from?: string; to?: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD (not UTC, which can be a day off near midnight). */
function iso(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function presets(now = new Date()): { label: string; range: Required<Range> }[] {
	const y = now.getFullYear();
	const m = now.getMonth();
	const daysAgo = new Date(now);
	daysAgo.setDate(now.getDate() - 29);
	return [
		{
			label: "This month",
			range: { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) },
		},
		{
			label: "Last month",
			range: { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
		},
		{ label: "Last 30 days", range: { from: iso(daysAgo), to: iso(now) } },
		{ label: "This year", range: { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) } },
	];
}

/**
 * From / To date inputs with quick presets. A range is applied as soon as both ends are valid and
 * in order; either end may be left empty for an open-ended range.
 */
export default function DateRangeField({
	value,
	onChange,
}: {
	value: Range;
	onChange: (range: Range) => void;
}) {
	const [from, setFrom] = useState(value.from ?? "");
	const [to, setTo] = useState(value.to ?? "");

	// Follow external changes (presets, "Clear all") without fighting what the user is typing.
	const incoming = `${value.from ?? ""}|${value.to ?? ""}`;
	const [seen, setSeen] = useState(incoming);
	if (incoming !== seen) {
		setSeen(incoming);
		setFrom(value.from ?? "");
		setTo(value.to ?? "");
	}

	const backwards = from !== "" && to !== "" && from > to;

	// Apply the range from the event that changed it (no effect): only while the order is valid.
	const edit = (nextFrom: string, nextTo: string) => {
		setFrom(nextFrom);
		setTo(nextTo);
		if (nextFrom !== "" && nextTo !== "" && nextFrom > nextTo) return;
		const next = { from: nextFrom || undefined, to: nextTo || undefined };
		if (next.from !== value.from || next.to !== value.to) onChange(next);
	};

	return (
		<Stack spacing={1.5}>
			<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
				{presets().map(({ label, range }) => {
					const active = value.from === range.from && value.to === range.to;
					return (
						<Chip
							key={label}
							size="small"
							label={label}
							color={active ? "primary" : "default"}
							variant={active ? "filled" : "outlined"}
							onClick={() => onChange(active ? {} : range)}
						/>
					);
				})}
			</Stack>
			<Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
				<TextField
					size="small"
					type="date"
					label="From"
					value={from}
					onChange={(e) => edit(e.target.value, to)}
					error={backwards}
					slotProps={{ inputLabel: { shrink: true } }}
				/>
				<TextField
					size="small"
					type="date"
					label="To"
					value={to}
					onChange={(e) => edit(from, e.target.value)}
					error={backwards}
					helperText={backwards ? "Before the start date" : undefined}
					slotProps={{ inputLabel: { shrink: true } }}
				/>
			</Stack>
		</Stack>
	);
}
