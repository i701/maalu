import { ACCENT } from "#/lib/m3";
import { formatMoney } from "#/lib/format";
import type { Budget, BudgetLine, BudgetStatus } from "#/types/api";

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

/** Lines that are close to their limit or over it, the worst first. */
export function linesNeedingAttention(budget: Budget): BudgetLine[] {
	return budget.lines
		.filter((l) => l.status !== "ok")
		.toSorted((a, b) => RANK[b.status] - RANK[a.status] || b.percent - a.percent);
}

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
export function budgetWarning(budget: Budget, categories: string[]): string | null {
	if (!budget.period.is_current) return null;
	const names = new Set(categories.map(normalize));
	const hit = linesNeedingAttention(budget).find((l) =>
		l.categories.some((c) => names.has(normalize(c.name))),
	);
	return hit ? describeLine(hit, budget.currency) : null;
}
