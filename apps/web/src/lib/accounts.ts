import type { AccountGroup, PaymentMethod } from "#/types/api";

/** Payment method to suggest when a transaction is placed in an account of this group. The user
 * can still change it; it just saves a step. */
export const SUGGESTED_PAYMENT_METHOD: Record<AccountGroup, PaymentMethod> = {
	cash: "cash",
	accounts: "bank_transfer",
	card: "credit_card",
	debit_card: "debit_card",
	savings: "bank_transfer",
	prepaid: "other",
	investments: "other",
	overdrafts: "bank_transfer",
	loan: "other",
	insurance: "other",
	others: "other",
};

/** Banks to suggest when typing an account's bank, on top of the ones already used. */
export const BANKS = ["BML", "MIB", "SBI", "HDFC", "Ooredoo m-Faisa", "Dhiraagu Pay"];

/** "BML · 7730000486374": which bank holds an account and its number there, in full, or null when
 * neither is set. Tells accounts with the same name apart. */
export function accountIdentity(a: {
	bank?: string | null;
	account_number?: string | null;
}): string | null {
	const parts = [a.bank, a.account_number].filter(Boolean);
	return parts.length > 0 ? parts.join(" · ") : null;
}

/** The banks to offer: those already on your accounts first, then the usual ones. */
export function bankChoices(accounts: { bank?: string | null }[]): string[] {
	const used = [...new Set(accounts.map((a) => a.bank).filter((b): b is string => Boolean(b)))];
	const known = new Set(used.map((b) => b.toLowerCase()));
	return [...used, ...BANKS.filter((b) => !known.has(b.toLowerCase()))];
}
