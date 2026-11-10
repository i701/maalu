import { useCardMorph } from "#/lib/card-morph";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ACCENT } from "#/lib/m3";
import Symbol from "../Symbol";

export type StripItem = {
	label: string;
	value: string;
	/** The change against the period before, in percent; null when there is nothing to compare. */
	percent: number | null;
	/** Whether a rise is good news (income, savings) or bad (spending). */
	goodWhenUp: boolean;
};

/** A change in a few characters: an arrow and a percentage, never colour alone. */
function Delta({ item, against }: { item: StripItem; against: string }) {
	if (item.percent === null) return null;
	const rounded = Math.round(item.percent);
	if (rounded === 0)
		return (
			<Typography
				variant="caption"
				sx={{ color: "text.secondary" }}
				title={`No change vs ${against}`}
			>
				No change
			</Typography>
		);
	const up = rounded > 0;
	const good = up === item.goodWhenUp;
	return (
		<Typography
			variant="caption"
			title={`${up ? "+" : "-"}${Math.abs(rounded)}% vs ${against}`}
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.25,
				fontWeight: 600,
				color: good ? ACCENT.green : "var(--md-sys-color-error)",
			}}
		>
			<Symbol name={up ? "arrow_upward" : "arrow_downward"} size={12} />
			{Math.abs(rounded)}%
		</Typography>
	);
}

/**
 * The month's headline figures (income, spending, what was kept) as one slim strip, for a phone:
 * three columns with the change against last month under each. A wider screen keeps its three
 * tiles; this replaces them below that, so they take one short strip instead of a screen.
 */
export default function MetricStrip({ items, against }: { items: StripItem[]; against: string }) {
	const cardMorph = useCardMorph();
	return (
		<Box
			sx={{
				display: { xs: "grid", sm: "none" },
				gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
				py: 1.25,
				...cardMorph,
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			{items.map((item, i) => (
				<Box
					key={item.label}
					sx={{
						px: 1.25,
						minWidth: 0,
						textAlign: "center",
						borderLeft: i === 0 ? 0 : "1px solid var(--md-sys-color-outline-variant)",
					}}
				>
					<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
						{item.label}
					</Typography>
					<Typography
						sx={{
							fontSize: 13,
							fontWeight: 600,
							lineHeight: 1.3,
							fontVariantNumeric: "tabular-nums",
							overflowWrap: "anywhere",
						}}
					>
						{item.value}
					</Typography>
					<Delta item={item} against={against} />
				</Box>
			))}
		</Box>
	);
}
