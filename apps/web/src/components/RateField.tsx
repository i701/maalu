import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import { useState, type ReactNode } from "react";
import { formatDate, trimRate } from "#/lib/format";
import { useMarketRate } from "#/lib/use-market-rate";

/**
 * The exchange-rate input for a foreign-currency amount. It looks up the market rate for the
 * date and, while you haven't typed anything, fills it in; type your own and yours stays. Under
 * the field it says where the number came from, and offers the market rate again if yours differs.
 * What is saved is always what is in the field.
 *
 * Mount it with a `key` that changes with the currency, and reset `value` when the currency
 * changes, so each currency starts fresh. A rate already in `value` when it mounts counts as typed.
 */
export default function RateField({
	from,
	to,
	on,
	label,
	value,
	onChange,
	error,
	hint,
}: {
	/** The foreign currency */
	from: string;
	/** Your base currency */
	to: string;
	/** The day to look the rate up for (YYYY-MM-DD) */
	on: string;
	label: string;
	value: string;
	onChange: (rate: string) => void;
	/** A message from the form's schema, shown under the field. */
	error?: string;
	/** Shown when there is nothing to say about the market rate */
	hint?: string;
}) {
	// Whether the rate in the field is the person's own: then a market rate never replaces it.
	const [own, setOwn] = useState(value !== "");
	const { market, status } = useMarketRate({
		from,
		to,
		on,
		enabled: true,
		onFound: (m) => {
			if (!own) onChange(trimRate(m.rate));
		},
	});

	const suggestion = market ? trimRate(market.rate) : null;
	const differs = suggestion !== null && value.trim() !== suggestion;

	function takeMarketRate() {
		if (suggestion === null) return;
		setOwn(false);
		onChange(suggestion);
	}

	let helper: ReactNode = hint ?? null;
	if (status === "loading" && value === "") helper = "Looking up the market rate…";
	else if (market && suggestion !== null) {
		const day = `${formatDate(market.rate_date)}${market.exact ? "" : " (nearest day)"}`;
		helper = differs ? (
			<>
				Market rate is {suggestion} ({day}).{" "}
				<Link component="button" type="button" onClick={takeMarketRate}>
					Use it
				</Link>
			</>
		) : (
			`Market rate for ${day}, from ${market.source}. Change it if your bank used another.`
		);
	} else if (status === "missing")
		helper = "No market rate found for this pair. Enter the rate yourself.";
	else if (status === "error")
		helper = "Couldn't look up the market rate. Enter the rate yourself.";

	return (
		<TextField
			label={label}
			value={value}
			onChange={(e) => {
				setOwn(true);
				onChange(e.target.value);
			}}
			placeholder="15.42"
			error={Boolean(error)}
			helperText={error ?? helper}
			required
			slotProps={{ htmlInput: { inputMode: "decimal" } }}
		/>
	);
}
