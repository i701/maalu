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
 * Mount it with a `key` that changes with the currency, so each currency starts fresh.
 */
export default function RateField({
	from,
	to,
	on,
	label,
	initial = "",
	name = "exchange_rate",
	hint,
}: {
	/** The foreign currency */
	from: string;
	/** Your base currency */
	to: string;
	/** The day to look the rate up for (YYYY-MM-DD) */
	on: string;
	label: string;
	/** A rate already saved for this record; it is never replaced by a suggestion */
	initial?: string;
	name?: string;
	/** Shown when there is nothing to say about the market rate */
	hint?: string;
}) {
	// What the user typed, or null while they haven't: then the field shows the market rate. A rate
	// saved earlier counts as typed, so a suggestion never replaces it.
	const [typed, setTyped] = useState<string | null>(initial !== "" ? initial : null);
	const { market, status } = useMarketRate({ from, to, on, enabled: true });

	const suggestion = market ? trimRate(market.rate) : null;
	const value = typed ?? suggestion ?? "";
	const differs = suggestion !== null && value.trim() !== suggestion;

	let helper: ReactNode = hint ?? null;
	if (status === "loading" && value === "") helper = "Looking up the market rate…";
	else if (market && suggestion !== null) {
		const day = `${formatDate(market.rate_date)}${market.exact ? "" : " (nearest day)"}`;
		helper = differs ? (
			<>
				Market rate is {suggestion} ({day}).{" "}
				<Link component="button" type="button" onClick={() => setTyped(null)}>
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
			name={name}
			value={value}
			onChange={(e) => setTyped(e.target.value)}
			placeholder="15.42"
			helperText={helper}
			required
			slotProps={{ htmlInput: { inputMode: "decimal" } }}
		/>
	);
}
