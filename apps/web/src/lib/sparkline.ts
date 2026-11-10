/** The geometry of a small trend line (a "sparkline"). Pure maths, so it is easy to test; the
 * component only draws what this returns. */

export type SparkDirection = "up" | "down" | "flat";

export type Spark = {
	/** The line, as an SVG path in a width x height box. */
	line: string;
	/** The same line closed down to the bottom edge, for a faint wash under it. */
	area: string;
	direction: SparkDirection;
	/** Where the last point sits, for the dot that marks "now". */
	end: { x: number; y: number };
};

/** Fewer than this many numbers is not a trend. */
const MIN_POINTS = 2;

const fmt = (n: number) => Number(n.toFixed(2));

/**
 * The line for `values` (oldest first) in a `width` x `height` box with `pad` room all round so the
 * stroke and the end dot are not clipped. A series that never moves is drawn as a flat line along
 * the bottom; one that does is stretched to the full height. Returns null when there is no trend.
 */
export function sparkline(
	values: readonly number[],
	width: number,
	height: number,
	pad = 4,
): Spark | null {
	const clean = values.filter((v) => Number.isFinite(v));
	if (clean.length < MIN_POINTS) return null;
	const min = Math.min(...clean);
	const max = Math.max(...clean);
	const span = max - min;
	const innerW = width - pad * 2;
	const innerH = height - pad * 2;
	const point = (v: number, i: number) => ({
		x: pad + (innerW * i) / (clean.length - 1),
		// the biggest number at the top; a series that never moves lies along the bottom, so every
		// row's line sits on the same baseline instead of some floating in the middle
		y: span === 0 ? height - pad : pad + innerH * (1 - (v - min) / span),
	});
	const points = clean.map(point);
	const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join(" ");
	const last = points.at(-1) as { x: number; y: number };
	const first = points[0] as { x: number; y: number };
	const area = `${line} L${fmt(last.x)} ${height} L${fmt(first.x)} ${height} Z`;
	const change = (clean.at(-1) as number) - (clean[0] as number);
	return {
		line,
		area,
		direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
		end: { x: fmt(last.x), y: fmt(last.y) },
	};
}
