import { ACCENT } from "#/lib/m3";
import type { BudgetStatus } from "#/types/api";

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
