import Box from "@mui/material/Box";
import { memo } from "react";
import { sparkline } from "#/lib/sparkline";

const COLOR = {
	up: "var(--chart-income)",
	down: "var(--chart-expense)",
	flat: "var(--md-sys-color-outline)",
} as const;

/**
 * A small line showing which way a number has been going, like the ones in a markets table: the
 * line, a faint wash under it and a dot for today. Green when it rose over the period, orange when
 * it fell (the chart colours the dashboard uses, which stay apart for colour-blind readers), grey
 * when it did not move. It is a hint, never the only place a figure appears, so it is hidden from
 * screen readers except for `label`, which says in words where it started and ended.
 */
const Sparkline = memo(function Sparkline({
	values,
	label,
	width = 96,
	height = 26,
}: {
	/** Oldest first. */
	values: number[];
	/** For screen readers, e.g. "Balance over the last 30 days: from MVR 900.00 to MVR 1,053.78". */
	label: string;
	width?: number;
	height?: number;
}) {
	const spark = sparkline(values, width, height);
	if (!spark) return null;
	const color = COLOR[spark.direction];
	return (
		<Box
			role="img"
			aria-label={label}
			sx={{ display: "block", width, height, lineHeight: 0, color }}
		>
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				aria-hidden="true"
				focusable="false"
				style={{ display: "block", overflow: "visible" }}
			>
				<path d={spark.area} fill="currentColor" opacity={0.1} />
				<path
					d={spark.line}
					fill="none"
					stroke="currentColor"
					strokeWidth={1.75}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<circle
					cx={spark.end.x}
					cy={spark.end.y}
					r={2.5}
					fill="currentColor"
					stroke="var(--md-sys-color-surface-container-low)"
					strokeWidth={1.5}
				/>
			</svg>
		</Box>
	);
});

export default Sparkline;
