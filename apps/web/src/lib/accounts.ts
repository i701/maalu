import { sumDecimals } from "#/lib/format";
import type { AccountGroup, PaymentMethod } from "#/types/api";

/** Payment method to suggest when a transaction is placed in an account of this group. The user
 * can still change it; it just saves a step. */
export const SUGGESTED_PAYMENT_METHOD: Record<AccountGroup, PaymentMethod> = {
	cash: "cash",
	accounts: "bank_transfer",
	card: "credit_card",
	savings: "bank_transfer",
	prepaid: "other",
	investments: "other",
	overdrafts: "bank_transfer",
	loan: "other",
	insurance: "other",
	others: "other",
};

/**
 * What each group means, shown when one is chosen. An account is a place that holds a balance. A
 * debit card is not one: it spends from its bank account, so it is paid with by choosing "Debit
 * card" as the payment method, and only a credit card (what you owe) is an account of its own.
 */
export const GROUP_HELP: Record<AccountGroup, string> = {
	cash: "Money you hold as notes and coins: a wallet, a drawer, a safe.",
	accounts:
		"A bank account you keep money in and pay from, such as a current account. Its debit card is part of it: spend with the card and the money comes out of this account.",
	card: "A credit card: you spend the bank's money and pay it back later, so the balance is what you owe. Repay it with a transfer from your bank account. Set a credit limit to see how much is used.",
	savings:
		"A bank savings account, or money you keep apart on purpose. Goals can follow its balance.",
	prepaid: "A top-up balance you spend down: phone credit, a transport card, a gift card.",
	investments: "Money invested in shares, funds or a business, whose value you track here.",
	overdrafts: "An overdraft on a bank account: money you owe the bank, up to a limit.",
	loan: "Money you owe and pay back in instalments, like a car or personal loan.",
	insurance: "A policy with a cash value, or a premium balance you keep.",
	others: "Anything that holds money and does not fit the rest.",
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

/** The groups that can have a credit limit: the most you can owe on them. */
export const CREDIT_LIMIT_GROUPS: readonly AccountGroup[] = ["card", "overdrafts"];

export const hasCreditLimit = (group: AccountGroup) => CREDIT_LIMIT_GROUPS.includes(group);

/** How much of a credit limit is used: what is owed, the limit, and the share used (a whole
 * percent, which can pass 100 when a card is over its limit). Null when there is no limit. */
export function creditUsage(a: {
	balance: string;
	credit_limit: string | null;
}): { owed: string; limit: string; percent: number } | null {
	if (a.credit_limit === null || Number(a.credit_limit) <= 0) return null;
	const owed = Number(a.balance) < 0 ? sumDecimals([a.balance.replace("-", "")]) : "0.00";
	return {
		owed,
		limit: a.credit_limit,
		percent: Math.round((Number(owed) / Number(a.credit_limit)) * 100),
	};
}

const negate = (v: string) => (v.startsWith("-") ? v.slice(1) : `-${v}`);

export type AdjustMode = "balance" | "amount";

/** What an adjustment would do, for the preview: the balance after, and the income or expense that
 * would be recorded. `kind` is null when nothing would change. `typed` is the text in the field. */
export function adjustmentPreview(
	current: string,
	mode: AdjustMode,
	typed: string,
): { after: string; amount: string; kind: "income" | "expense" | null } | null {
	if (!/^-?\d+(\.\d{1,4})?$/.test(typed.trim())) return null;
	const value = typed.trim();
	const difference =
		mode === "balance" ? sumDecimals([value, negate(current)]) : sumDecimals([value]);
	const after = mode === "balance" ? sumDecimals([value]) : sumDecimals([current, value]);
	const size = difference.replace("-", "");
	if (Number(difference) === 0) return { after, amount: "0.00", kind: null };
	return { after, amount: size, kind: Number(difference) > 0 ? "income" : "expense" };
}

/** The line under the totals when some account is left out of them (and the results are not already
 * about one account), or undefined. */
export function excludedNote(
	accounts: { exclude_from_stats: boolean }[],
	filteredToAccount: boolean,
): string | undefined {
	if (filteredToAccount || !accounts.some((a) => a.exclude_from_stats)) return undefined;
	return "Accounts you left out of your totals, and balance adjustments, are not counted here.";
}
