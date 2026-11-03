import { memo } from "react";
import type { Change } from "#/lib/compare";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import Symbol from "../Symbol";
import TonalChip from "../TonalChip";

/** How far a category moved: the amount, with the share it is of before, and a word for the ones
 * that appeared or went away. An arrow carries the direction and green or red whether that is good
 * news, so neither is the only signal. */
const DeltaChip = memo(function DeltaChip({
	row,
	currency,
	goodWhenUp,
}: {
	/** a category's row (which knows whether it is new or gone), or a plain total */
	row: Change & { state?: "new" | "gone" | "both" };
	currency: string;
	goodWhenUp: boolean;
}) {
	const amount = Number(row.change);
	if (amount === 0) return <TonalChip accent="var(--md-sys-color-outline)" label="No change" />;
	const up = amount > 0;
	const text = formatMoney(row.change.replace("-", ""), currency);
	const detail =
		row.state === "new"
			? "new"
			: row.state === "gone"
				? "none now"
				: row.percent === null
					? null
					: `${Math.round(Math.abs(row.percent))}%`;
	return (
		<TonalChip
			accent={up === goodWhenUp ? ACCENT.green : "var(--md-sys-color-error)"}
			icon={<Symbol name={up ? "arrow_upward" : "arrow_downward"} size={14} />}
			label={detail ? `${text} · ${detail}` : text}
		/>
	);
});

export default DeltaChip;
