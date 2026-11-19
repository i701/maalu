import type { Transaction } from "#/types/api";
import { PAYMENT_METHOD_LABELS } from "#/types/api";
import { cardText } from "./cards";
import { formatDate } from "./format";
import { daysBetween } from "./planned";

/** Shared by the transaction table, its cards and the upcoming list, so all show the same facts. */
export function txTitle(t: Transaction) {
	return t.type === "transfer"
		? `${t.account?.name ?? "Deleted account"} → ${t.to_account?.name ?? "Deleted account"}`
		: (t.vendor?.name ?? (t.splits.length > 1 ? "Split purchase" : t.category));
}

/** The category, or every category a split transaction touches. */
export function txCategories(t: Transaction) {
	return t.splits.length > 1
		? [...new Set(t.splits.map((s) => s.category))].join(", ")
		: t.category;
}

export function txSubtitle(t: Transaction) {
	return (
		t.type === "transfer"
			? [t.description]
			: [
					t.vendor || t.splits.length > 1 ? txCategories(t) : null,
					t.description,
					t.card ? cardText(t.card) : null,
				]
	)
		.filter(Boolean)
		.join(" · ");
}

/** A row's title: the vendor, else what the user typed as the description, else the category. */
export const txRowTitle = (t: Transaction) =>
	t.type === "transfer" ? txTitle(t) : (t.vendor?.name ?? (t.description || txTitle(t)));

/** The one quiet line under a row's title: its category (every one a split touches) and how it was
 * paid (the card, or the payment method). Everything else waits in the detail drawer. */
export function txRowLine(t: Transaction) {
	if (t.type === "transfer") return "Transfer";
	return [txCategories(t), t.card ? cardText(t.card) : PAYMENT_METHOD_LABELS[t.payment_method]]
		.filter(Boolean)
		.join(" · ");
}

/** A day's heading in the list: "Today", "Yesterday", "Tomorrow", or the date. */
export function dayHeading(date: string, today: string) {
	const ago = daysBetween(date, today);
	if (ago === 0) return "Today";
	if (ago === 1) return "Yesterday";
	if (ago === -1) return "Tomorrow";
	return formatDate(date);
}
