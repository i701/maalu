/** Small pure helpers for the hand-drawn charts: round axis ticks and compact labels. */

/** About `count` round tick values covering [min, max]: steps of 1, 2 or 5 times a power of ten. */
export function niceTicks(min: number, max: number, count = 4): number[] {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
	if (min === max) {
		const pad = Math.abs(min) || 1;
		min -= pad;
		max += pad;
	}
	const raw = (max - min) / count;
	const power = 10 ** Math.floor(Math.log10(raw));
	const fraction = raw / power;
	const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
	const first = Math.floor(min / step) * step;
	const ticks: number[] = [];
	for (let v = first; v < max + step - step / 1e6; v += step)
		ticks.push(Math.round(v / step) * step);
	return ticks;
}

/** 950 -> "950", 1200 -> "1.2K", 3,400,000 -> "3.4M": for axis labels, where space is tight. */
export function compact(value: number): string {
	const abs = Math.abs(value);
	const sign = value < 0 ? "-" : "";
	if (abs < 1000) return `${sign}${Math.round(abs)}`;
	const [n, unit] =
		abs < 1_000_000
			? [abs / 1000, "K"]
			: abs < 1_000_000_000
				? [abs / 1_000_000, "M"]
				: abs < 1_000_000_000_000
					? [abs / 1_000_000_000, "B"]
					: [abs / 1_000_000_000_000, "T"];
	return `${sign}${n >= 100 ? Math.round(n) : Number(n.toFixed(1))}${unit}`;
}

/**
 * Label positions (vertical centres) that keep at least `gap` px apart, as close as they can be to
 * where their nodes are, inside [min, max]. Takes and returns the centres in the same order.
 */
export function spreadLabels(centers: number[], gap: number, min: number, max: number): number[] {
	const order = centers.map((c, i) => ({ c, i })).toSorted((a, b) => a.c - b.c);
	const placed = order.map(({ c }) => Math.min(Math.max(c, min), max));
	for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + gap);
	// pushed past the bottom? slide the pile back up
	const over = (placed.at(-1) ?? 0) - max;
	if (over > 0) {
		placed[placed.length - 1] -= over;
		for (let k = placed.length - 2; k >= 0; k--)
			placed[k] = Math.min(placed[k], placed[k + 1] - gap);
	}
	const out = Array.from({ length: centers.length }, () => 0);
	order.forEach(({ i }, k) => (out[i] = placed[k]));
	return out;
}
