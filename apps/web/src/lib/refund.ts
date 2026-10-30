import type { Transaction } from "#/types/api";
import { formatDate, formatMoney, sumDecimals } from "./format";
import { txTitle } from "./tx-display";

/** What is left to refund of a purchase, or of one of its items: its amount less what the refunds
 * so far gave back ("30.00"). Exact decimal maths, never floats. */
export function amountLeft(amount: string, refunded: string): string {
	return sumDecimals([amount, `-${refunded}`]);
}

/** A refund: income that gives back part of an earlier purchase. */
export function isRefund(t: Transaction): boolean {
	return t.refund_of !== null;
}

/** Whether a purchase has anything left to refund. Planned ones have not happened yet. */
export function canRefund(t: Transaction): boolean {
	return t.type === "expense" && !t.planned && Number(amountLeft(t.amount, t.refunded_amount)) > 0;
}

/** Whether refunds have given part of this purchase back. */
export function wasRefunded(t: Transaction): boolean {
	return Number(t.refunded_amount) > 0;
}

/** One item of a purchase that a refund can give back. */
export type RefundItem = {
	/** The item's id on the purchase. */
	id: string;
	name: string;
	category: string;
	/** What is left to refund of it. */
	left: string;
	/** What this refund gives back of it. */
	amount: string;
	on: boolean;
};

/** The items a new refund can pick from: every item of the purchase, none ticked yet. */
export function itemsToPick(purchase: Transaction): RefundItem[] {
	return purchase.splits.map((s) => {
		const left = amountLeft(s.amount, s.refunded_amount);
		return { id: s.id, name: s.name, category: s.category, left, amount: left, on: false };
	});
}

/** The items an existing refund already gives back, with their amounts to change. */
export function itemsOfRefund(refund: Transaction): RefundItem[] {
	return refund.splits.map((s) => ({
		id: s.refund_of_split_id ?? s.id,
		name: s.name,
		category: s.category,
		left: s.amount,
		amount: s.amount,
		on: true,
	}));
}

/** The ticked items as the lines the API wants: each names the item it gives back (and takes its
 * category from it). */
export function refundLines(items: RefundItem[]) {
	return items
		.filter((i) => i.on)
		.map((i) => ({
			name: i.name,
			quantity: "1",
			category: i.category,
			amount: i.amount.trim(),
			refund_of_split_id: i.id,
		}));
}

/** What the dialog says it is about: the purchase, what it cost and when. */
export function refundContext(purchase?: Transaction, refund?: Transaction): string {
	if (purchase) {
		const cost = formatMoney(purchase.amount, purchase.currency);
		return `${txTitle(purchase)} · ${cost} on ${formatDate(purchase.transaction_date)}`;
	}
	const of = refund?.refund_of;
	if (!of) return "";
	const cost = formatMoney(of.amount, of.currency);
	return `${of.vendor_name ?? of.category} · ${cost} on ${formatDate(of.transaction_date)}`;
}
