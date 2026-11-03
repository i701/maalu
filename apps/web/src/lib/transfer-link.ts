import type { Transaction } from "#/types/api";

/** Whether a transaction can be the expense side of a merged transfer: money that left an account,
 * posted, not a correction, and nothing that would be lost (items) or contradicted (refunds). */
function canBeExpenseSide(t: Transaction): boolean {
	return (
		t.type === "expense" &&
		t.account !== null &&
		!t.planned &&
		!t.adjustment &&
		t.splits.length === 0 &&
		Number(t.refunded_amount) === 0
	);
}

/** Whether a transaction can be the income side: money that arrived in an account, posted, and not
 * a refund (money back for a purchase) or a correction. */
function canBeIncomeSide(t: Transaction): boolean {
	return (
		t.type === "income" && t.account !== null && !t.planned && !t.adjustment && t.refund_of === null
	);
}

/** From exactly two selected transactions, the pair to link as one transfer (the expense and the
 * income, in different accounts), or null when they are not that. */
export function linkablePair(
	selected: Transaction[],
): { expense: Transaction; income: Transaction } | null {
	if (selected.length !== 2) return null;
	const expense = selected.find(canBeExpenseSide);
	const income = selected.find(canBeIncomeSide);
	if (!expense || !income) return null;
	if (expense.account?.id === income.account?.id) return null;
	return { expense, income };
}

/** "same day", "1 day apart", "2 days apart". */
export function daysApartText(days: number): string {
	if (days === 0) return "same day";
	return `${days} ${days === 1 ? "day" : "days"} apart`;
}
