export type RatePoint = { date: string; rate: string };

export type RateSummary = {
	first: number;
	last: number;
	low: number;
	high: number;
	/** how much the rate moved from the first point to the last, in percent */
	change: number;
};

/** The start, end, range and movement of a series of rates, oldest first; null with no points. */
export function summarize(points: RatePoint[]): RateSummary | null {
	if (points.length === 0) return null;
	const values = points.map((p) => Number(p.rate));
	const first = values[0];
	const last = values[values.length - 1];
	return {
		first,
		last,
		low: Math.min(...values),
		high: Math.max(...values),
		change: first === 0 ? 0 : ((last - first) / first) * 100,
	};
}

/** A rate without needless zeros: 15.4 not 15.40000000, but never fewer than the 4 decimals that
 * matter for a currency like the Maldivian rufiyaa against the dollar. */
export function formatRate(value: number): string {
	return Number(value.toFixed(4)).toString();
}

/** The ranges the history offers, in days. */
export const HISTORY_RANGES = [30, 90, 365] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];
