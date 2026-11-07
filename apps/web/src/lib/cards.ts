import type { TransactionSeed } from "#/components/transaction-form/request";
import type { AccountGroup, AccountRef, Card, CardKind, CardRef, PaymentMethod } from "#/types/api";

/** Groups that hold a debt: a debit card cannot spend from them. */
const DEBT_GROUPS: readonly AccountGroup[] = ["card", "overdrafts", "loan"];

/** "MIB Visa debit ••2815", or just the name when no digits were given. */
export const cardText = (c: Pick<CardRef, "name" | "last_digits">): string =>
	c.last_digits ? `${c.name} ••${c.last_digits}` : c.name;

/** How a purchase with this kind of card is paid. */
export const cardMethod = (kind: CardKind): PaymentMethod =>
	kind === "credit" ? "credit_card" : "debit_card";

/** Can a card of this kind be tied to an account of this group? A credit card is its own account
 * (group card); a debit card spends from a bank account, never a debt. */
export const accountFitsCard = (kind: CardKind, group: AccountGroup): boolean =>
	kind === "credit" ? group === "card" : !DEBT_GROUPS.includes(group);

/** Accounts a credit card can be repaid from: any that is not a debt. */
export const canRepayFrom = (group: AccountGroup): boolean => !DEBT_GROUPS.includes(group);

/** The cards on an account's page: the ones tied to it, and the credit cards repaid from it. */
export function cardsOf(cards: Card[], accountId: string) {
	return {
		own: cards.filter((c) => c.account.id === accountId),
		repaid: cards.filter((c) => c.repay_account?.id === accountId),
	};
}

/** Paying a credit card off: a transfer from the account it is repaid from into the card's own
 * account, ready to be given an amount (or starting with the one passed). Null when the card has no repayment account. */
export function repaymentSeed(card: Card, amount = ""): TransactionSeed | null {
	if (card.kind !== "credit" || !card.repay_account) return null;
	return {
		type: "transfer",
		amount,
		to_amount: null,
		payment_method: "bank_transfer",
		category: "",
		description: `${card.name} repayment`,
		splits: [],
		currency: card.repay_account.currency,
		exchange_rate: "",
		subscription: null,
		account: card.repay_account as AccountRef,
		to_account: card.account as AccountRef,
		card: null,
		vendorName: "",
		tags: [],
		location: null,
	};
}

/** The label for the card a filter is on ("MIB Visa debit ••2815"), or null when there is none. */
export const cardFilterLabel = (cards: Card[], id: string | undefined): string | null => {
	const found = id ? cards.find((c) => c.id === id) : undefined;
	return found ? cardText(found) : null;
};
