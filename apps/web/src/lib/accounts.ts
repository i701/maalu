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
