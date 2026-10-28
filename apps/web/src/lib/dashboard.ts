import type { CategoryTotal } from "#/types/api";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** First and last day (inclusive) of the calendar month containing an ISO date. */
export function monthBounds(on: string): { start: string; end: string } {
	const [y, m] = on.split("-").map(Number);
	const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
	return { start: iso(y, m, 1), end: iso(y, m, last) };
}

/** The first day of the month `months` away from the one containing an ISO date. */
export function shiftMonth(on: string, months: number): string {
	const [y, m] = on.split("-").map(Number);
	const d = new Date(Date.UTC(y, m - 1 + months, 1));
	return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/** "October 2026" for an ISO date, or "Oct" with `short`. */
export function monthLabel(on: string, short = false): string {
	return new Date(`${on.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-GB", {
		month: short ? "short" : "long",
		...(short ? {} : { year: "numeric" }),
	});
}

/** Change from `previous` to `current` as a percentage, or null when there is nothing to compare
 * with (a previous value of zero, or below zero). Display only, so plain numbers are fine. */
export function percentChange(current: string, previous: string): number | null {
	const prev = Number(previous);
	if (!(prev > 0)) return null;
	return ((Number(current) - prev) / prev) * 100;
}

export type SpendingRow = { name: string; total: number; share: number };

/** The `top` biggest expense categories, with the rest folded into one "Other" row. */
export function spendingRows(categories: CategoryTotal[], top = 6): SpendingRow[] {
	const expenses = categories
		.filter((c) => c.type === "expense")
		.map((c) => ({ name: c.category, total: Number(c.total) }))
		.filter((c) => c.total > 0)
		.toSorted((a, b) => b.total - a.total);
	const sum = expenses.reduce((acc, c) => acc + c.total, 0);
	if (sum === 0) return [];
	const head = expenses.slice(0, top);
	const rest = expenses.slice(top).reduce((acc, c) => acc + c.total, 0);
	const rows = rest > 0 ? [...head, { name: "Other", total: rest }] : head;
	return rows.map((r) => ({ ...r, share: r.total / sum }));
}
