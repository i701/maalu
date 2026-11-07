import { formatDate, formatMoney } from "#/lib/format";
import type { CardStatement } from "#/types/api";

/** "5th", "22nd": the day of the month as it is said. */
export function ordinal(n: number): string {
	const suffixes = ["th", "st", "nd", "rd"];
	const v = n % 100;
	return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? "th"}`;
}

/** "in 4 days", "tomorrow", "today", "3 days ago". */
export function dueIn(days: number): string {
	if (days === 0) return "today";
	if (days === 1) return "tomorrow";
	if (days === -1) return "yesterday";
	return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export type StatementTone = "ok" | "warn" | "late" | "quiet";

/** How a statement reads at a glance: a label for the chip and a tone for its colour. */
export function statementStatus(s: CardStatement): { label: string; tone: StatementTone } {
	switch (s.state) {
		case "overdue":
			return { label: "Payment overdue", tone: "late" };
		case "due":
			return {
				label: s.days_until_due <= 3 ? "Due soon" : "To pay",
				tone: s.days_until_due <= 3 ? "warn" : "ok",
			};
		case "paid":
			return { label: "Paid", tone: "ok" };
		default:
			return { label: "Nothing to pay", tone: "quiet" };
	}
}

/** The one line for a card on the Accounts list: "Pay MVR 600.00 by 12 Nov (in 4 days)". */
export function statementLine(s: CardStatement): string {
	const money = (v: string) => formatMoney(v, s.currency);
	switch (s.state) {
		case "overdue":
			return `${money(s.remaining)} was due ${formatDate(s.due_on)} (${dueIn(s.days_until_due)})`;
		case "due":
			return `Pay ${money(s.remaining)} by ${formatDate(s.due_on)} (${dueIn(s.days_until_due)})`;
		case "paid":
			return `Statement of ${money(s.statement_balance)} paid`;
		default:
			return `Nothing to pay. Next statement closes ${formatDate(s.next_closes_on)}`;
	}
}

/** "Closes on the 5th, due on the 25th" for the form's summary and the panel. */
export const scheduleText = (s: { statement_day: number; due_day: number }): string =>
	`Closes on the ${ordinal(s.statement_day)}, due on the ${ordinal(s.due_day)}`;
