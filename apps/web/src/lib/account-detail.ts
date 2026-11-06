import type { AreaPoint } from "#/components/charts/AreaChart";
import type { BalanceAfter, BalanceHistory, Transaction } from "#/types/api";
import { formatDate } from "./format";

/** What a transaction did to one particular account, for that account's own page. */
export type AccountEffect = {
	/** Money came in (true) or went out (false) */
	positive: boolean;
	/** In the account's own currency */
	amount: string;
	currency: string;
	/** The other side of a transfer: "To Savings" or "From Main"; null for anything else */
	counterpart: string | null;
};

/**
 * The effect of a transaction on the account `accountId`: income and refunds come in, expenses go
 * out, and a transfer goes out of its source and comes in to its destination, where it is the amount
 * that arrived, in the destination's currency.
 */
export function accountEffect(t: Transaction, accountId: string): AccountEffect {
	if (t.type === "transfer") {
		if (t.account?.id === accountId)
			return {
				positive: false,
				amount: t.amount,
				currency: t.currency,
				counterpart: `To ${t.to_account?.name ?? "a deleted account"}`,
			};
		return {
			positive: true,
			amount: t.to_amount ?? t.amount,
			currency: t.to_account?.currency ?? t.currency,
			counterpart: `From ${t.account?.name ?? "a deleted account"}`,
		};
	}
	return {
		positive: t.type === "income",
		amount: t.amount,
		currency: t.currency,
		counterpart: null,
	};
}

/** "+MVR 1,000.00" / "−MVR 50.00": the sign goes first, as on the Transactions page. */
export const signOf = (effect: Pick<AccountEffect, "positive">): string =>
	effect.positive ? "+" : "−";

/** The ranges the balance chart offers, in days. */
export const HISTORY_RANGES = [30, 90, 365] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];
export const DEFAULT_HISTORY_RANGE: HistoryRange = 90;
export const RANGE_LABELS: Record<HistoryRange, string> = {
	30: "30 days",
	90: "90 days",
	365: "1 year",
};

/** The history as chart points, one per day, each labelled with its date. */
export const historyPoints = (history: BalanceHistory): AreaPoint[] =>
	history.points.map((p) => ({ label: formatDate(p.date), value: Number(p.balance) }));

/** What the table view lists: one row a week, newest first, and always the latest day, so a
 * year does not become 365 rows. */
export function historyRows(history: BalanceHistory): { date: string; balance: string }[] {
	const points = history.points;
	return points
		.filter((_, i) => (points.length - 1 - i) % 7 === 0)
		.toReversed()
		.map((p) => ({ date: p.date, balance: p.balance }));
}

/** Balance-after figures by transaction id, to look up while drawing a row. */
export const balanceMap = (list: BalanceAfter[]): Record<string, string> =>
	Object.fromEntries(list.map((b) => [b.transaction_id, b.balance]));

/** How the balance moved over the period: first day to last, with the lowest and highest on the way. */
export function historySummary(history: BalanceHistory) {
	const values = history.points.map((p) => Number(p.balance));
	if (values.length === 0) return null;
	return {
		first: values[0],
		last: values[values.length - 1],
		low: Math.min(...values),
		high: Math.max(...values),
	};
}
