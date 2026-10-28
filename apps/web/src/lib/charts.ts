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
	const [n, unit] = abs < 1_000_000 ? [abs / 1000, "K"] : [abs / 1_000_000, "M"];
	return `${sign}${n >= 100 ? Math.round(n) : Number(n.toFixed(1))}${unit}`;
}
