import type { CategoryMonthRow } from "#/types/api";
import { monthBounds, shiftMonth } from "./dashboard";
import { sumDecimals } from "./format";

/** How many months the table can span. */
export const TREND_RANGES = [6, 12, 24] as const;
export type TrendRange = (typeof TREND_RANGES)[number];

/** The first and last day to ask for so that the table ends with the month `today` is in and spans
 * `months` months. */
export function trendBounds(months: number, today: string): { date_from: string; date_to: string } {
	return {
		date_from: shiftMonth(today, -(months - 1)),
		date_to: monthBounds(today).end,
	};
}

/** "Mar 26" for "2026-03": short enough for a narrow column, with the year so a long range reads. */
export function monthColumn(month: string): string {
	const [y, m] = month.split("-").map(Number);
	const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
		month: "short",
		timeZone: "UTC",
	});
	return `${name} ${String(y).slice(2)}`;
}

/** "March 2026" for "2026-03". */
export function monthTitle(month: string): string {
	const [y, m] = month.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

/** What every row came to in each month, added up exactly, for the footer. */
export function columnTotals(rows: CategoryMonthRow[], monthCount: number): string[] {
	return Array.from({ length: monthCount }, (_, i) => sumDecimals(rows.map((r) => r.amounts[i])));
}

/** How strongly to shade a cell: its share of the biggest figure in the table, 0 to 1. A refund
 * (below zero) and an empty month are not shaded. */
export function heat(value: string, max: number): number {
	const v = Number(value);
	return v > 0 && max > 0 ? Math.min(v / max, 1) : 0;
}

/** The biggest single month in the table, for scaling the shading. */
export function maxCell(rows: CategoryMonthRow[]): number {
	let max = 0;
	for (const r of rows) for (const a of r.amounts) max = Math.max(max, Number(a));
	return max;
}

/** What a category averages over the months shown, as a decimal string, to two places. Display
 * only, so plain numbers are fine; the exact figures are the row's `total` and `amounts`. */
export function monthlyAverage(row: CategoryMonthRow): string {
	return (Number(row.total) / Math.max(row.amounts.length, 1)).toFixed(2);
}

/** Index of the month a category came to most in, or null when it never came to anything above
 * zero. The first of equal months wins. */
export function busiestMonth(row: CategoryMonthRow): number | null {
	let best: number | null = null;
	row.amounts.forEach((a, i) => {
		if (Number(a) > 0 && (best === null || Number(a) > Number(row.amounts[best]))) best = i;
	});
	return best;
}

const CENTS = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

/** A figure for a narrow cell: no currency, two decimals until it is large enough not to need them, "–" for nothing. */
export function cellText(value: string): string {
	const v = Number(value);
	if (v === 0) return "–";
	return (Math.abs(v) >= 1000 ? WHOLE : CENTS).format(v);
}

const atLeastZero = (amount: string) => Math.max(Number(amount), 0);

export type StackSeries = {
	name: string;
	/** a category's accent name, or null for the folded-together "Other" */
	color: string | null;
	/** one per month, never below zero (a refund-heavy month has nothing to stack) */
	values: number[];
};

/** The series for a stacked column chart: the `top` categories that came to most, biggest first
 * (so they sit at the bottom of every column), and everything else added into one "Other" at the
 * top. A column cannot show a negative amount, so refunds past a category's spending count as
 * zero here; the table has the exact figures. A single category is never hidden behind "Other". */
export function stackSeries(rows: CategoryMonthRow[], top = 6): StackSeries[] {
	const ranked = rows
		.filter((r) => Number(r.total) > 0)
		.toSorted((a, b) => Number(b.total) - Number(a.total));
	const keepAll = ranked.length <= top + 1;
	const shown = keepAll ? ranked : ranked.slice(0, top);
	const rest = keepAll ? [] : ranked.slice(top);
	const series: StackSeries[] = shown.map((r) => ({
		name: r.parent ? `${r.parent} › ${r.category}` : r.category,
		color: r.color,
		values: r.amounts.map(atLeastZero),
	}));
	if (rest.length > 0) {
		const length = rest[0].amounts.length;
		series.push({
			name: "Other",
			color: null,
			values: Array.from({ length }, (_, i) =>
				rest.reduce((sum, r) => sum + atLeastZero(r.amounts[i]), 0),
			),
		});
	}
	return series;
}

/** How tall each column is: the series added up month by month. */
export function stackTotals(series: StackSeries[], monthCount: number): number[] {
	return Array.from({ length: monthCount }, (_, i) =>
		series.reduce((sum, s) => sum + s.values[i], 0),
	);
}

/** An accent name for each series such that no two share one, so every segment of a column can be
 * told apart. The first series with an accent keeps it; a later one that repeats it gets the first
 * accent from `palette` that no series in the chart has (or, when none is left, keeps its own).
 * `Other` (null) takes no accent. */
export function distinctAccents(
	series: StackSeries[],
	palette: readonly string[],
): (string | null)[] {
	const owned = new Set(series.flatMap((s) => (s.color === null ? [] : [s.color])));
	const used = new Set<string>();
	return series.map((s) => {
		if (s.color === null) return null;
		if (!used.has(s.color)) {
			used.add(s.color);
			return s.color;
		}
		const free = palette.find((p) => !owned.has(p) && !used.has(p));
		if (free) used.add(free);
		return free ?? s.color;
	});
}
