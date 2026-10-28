import { ACCENT } from "#/lib/m3";
import Symbol from "../Symbol";
import TonalChip from "../TonalChip";

/** A signed change against a named period, such as "+12% vs September". Colour says whether the
 * change is good (green) or bad (red) for the reader, and the arrow carries direction too, so
 * colour is never the only signal. */
export default function DeltaBadge({
	percent,
	goodWhenUp,
	against,
}: {
	percent: number | null;
	/** Whether a rise is good news (income, savings) or bad (spending) */
	goodWhenUp: boolean;
	/** What it is compared with, for example "September" */
	against: string;
}) {
	if (percent === null) return null;
	const rounded = Math.round(percent);
	if (rounded === 0)
		return <TonalChip accent="var(--md-sys-color-outline)" label={`No change vs ${against}`} />;
	const up = rounded > 0;
	const good = up === goodWhenUp;
	return (
		<TonalChip
			accent={good ? ACCENT.green : "var(--md-sys-color-error)"}
			icon={<Symbol name={up ? "arrow_upward" : "arrow_downward"} size={14} />}
			label={`${up ? "+" : "-"}${Math.abs(rounded)}% vs ${against}`}
		/>
	);
}
