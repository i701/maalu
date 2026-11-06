import { ACCENT } from "#/lib/m3";
import { formatDate, formatMoney } from "#/lib/format";
import type { Budget, BudgetFixedLine, BudgetLine, BudgetStatus } from "#/types/api";

/** The colour of a budget line's bar and tag: calm while fine, amber when close, red when over. */
export const STATUS_COLOR: Record<BudgetStatus, string> = {
	ok: ACCENT.green,
	warning: ACCENT.amber,
	over: "var(--md-sys-color-error)",
};

export const STATUS_LABEL: Record<BudgetStatus, string> = {
	ok: "On track",
	warning: "Close to limit",
	over: "Over the limit",
};

/** An ISO date `days` away from another, without any time-zone drift. */
export function addDays(iso: string, days: number): string {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A decimal string without its minus sign: for "over by X", where the sign is already in the words. */
export const unsigned = (value: string) => (value.startsWith("-") ? value.slice(1) : value);

const normalize = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

const RANK: Record<BudgetStatus, number> = { ok: 0, warning: 1, over: 2 };

/** The limits for set dates that are running now. */
export const runningFixed = (budget: Budget): BudgetFixedLine[] =>
	(budget.fixed_lines ?? []).filter((l) => l.state === "active");

/** The limits for set dates whose dates touch the period on screen (ISO dates compare as text), so
 * a limit for November is not listed under December. The full list stays in `budget.fixed_lines`
 * for the form, which needs every limit to tell which categories are taken. */
export const fixedInPeriod = (budget: Budget): BudgetFixedLine[] =>
	(budget.fixed_lines ?? []).filter(
		(l) => l.start_date <= budget.period.end && l.end_date >= budget.period.start,
	);

/** Lines that are close to their limit or over it, the worst first: the per-period ones of this
 * period and the limits for set dates that are running. */
export function linesNeedingAttention(budget: Budget): BudgetLine[] {
	return [...budget.lines, ...runningFixed(budget)]
		.filter((l) => l.status !== "ok")
		.toSorted((a, b) => RANK[b.status] - RANK[a.status] || b.percent - a.percent);
}

/** "12 Nov – 20 Nov 2026 · 6 days left" for a limit with set dates. */
export function fixedWindow(line: BudgetFixedLine): string {
	const range = `${formatDate(line.start_date)} – ${formatDate(line.end_date)}`;
	if (line.state === "ended") return `${range} · ended`;
	const days = line.days_left ?? 0;
	const left = `${days} ${days === 1 ? "day" : "days"}`;
	return line.state === "upcoming" ? `${range} · ${left} to its end` : `${range} · ${left} left`;
}

/** "Runs 01 Nov 2026 – 31 Jan 2027" for a monthly limit that only runs between two dates. */
export function runsWindow(line: BudgetLine): string | null {
	return line.runs_from && line.runs_until
		? `Runs ${formatDate(line.runs_from)} – ${formatDate(line.runs_until)}`
		: null;
}

/** The stretch that follows a limit for set dates, as long as it was: it starts the day after
 * this one ends. */
export function nextStretch(line: Pick<BudgetFixedLine, "start_date" | "end_date">): {
	start: string;
	end: string;
} {
	const [y, m, d] = line.start_date.split("-").map(Number);
	const [y2, m2, d2] = line.end_date.split("-").map(Number);
	const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y, m - 1, d)) / 86_400_000);
	const start = addDays(line.end_date, 1);
	return { start, end: addDays(start, days) };
}

/** Whether two sets of dates share a day. */
export const datesOverlap = (a: [string, string], b: [string, string]): boolean =>
	a[0] <= b[1] && b[0] <= a[1];

/** One line's status in words: "Groceries is at 85% of its limit" / "... is over its limit by X". */
export function describeLine(line: BudgetLine, currency: string): string {
	return line.status === "over"
		? `${line.name} is over its limit by ${formatMoney(unsigned(line.available), currency)}`
		: `${line.name} is at ${line.percent}% of its limit`;
}

/**
 * What to tell someone who has just saved an expense in `categories`: the worst of the limits that
 * cover them, if it is close or over. Nothing for a past period, which they can no longer act on.
 */
export function budgetWarning(
	budget: Budget,
	categories: string[],
	/** The day of the expense: a limit for set dates only counts when it falls inside them. */
	on?: string,
): string | null {
	const names = new Set(categories.map(normalize));
	const covers = (l: BudgetLine) => l.categories.some((c) => names.has(normalize(c.name)));
	const periodic = budget.period.is_current
		? budget.lines.filter((l) => l.status !== "ok" && covers(l))
		: [];
	const dated = runningFixed(budget).filter(
		(l) => l.status !== "ok" && covers(l) && (!on || (on >= l.start_date && on <= l.end_date)),
	);
	const hit = [...periodic, ...dated].toSorted(
		(a, b) => RANK[b.status] - RANK[a.status] || b.percent - a.percent,
	)[0];
	return hit ? describeLine(hit, budget.currency) : null;
}
