import type { Transaction } from "#/types/api";

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
