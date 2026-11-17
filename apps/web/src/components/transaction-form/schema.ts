import { z } from "zod";
import { SUGGESTED_PAYMENT_METHOD } from "#/lib/accounts";
import { formatTime, trimRate } from "#/lib/format";
import { placeValueSchema } from "#/lib/places";
import { localToday } from "#/lib/planned";
import { exchangeRate, positiveAmount, timeOfDay } from "#/server/transactions";
import { type AccountRef, PAYMENT_METHODS, TRANSACTION_TYPES, type Transaction } from "#/types/api";
import type { TransactionSeed } from "./request";

/** Every field of the transaction form. Blank optional fields stay "" and the request builders
 * decide what they mean, so what the form holds and what it submits have the same shape. */
const fields = z.object({
	type: z.enum(TRANSACTION_TYPES),
	account_id: z.string(),
	to_account_id: z.string(),
	card_id: z.string(),
	amount: z.string().trim(),
	to_amount: z.string().trim(),
	currency: z.string().trim(),
	exchange_rate: z.string().trim(),
	payment_method: z.enum(PAYMENT_METHODS),
	category: z.string().trim().max(100),
	vendor: z.string().trim().max(200),
	tags: z.array(z.string()).max(10),
	description: z.string().trim(),
	transaction_date: z.iso.date("Choose a date"),
	transaction_time: timeOfDay.or(z.literal("")),
	planned: z.boolean(),
	subscription: z.object({ id: z.string(), name: z.string() }).nullable(),
	location: placeValueSchema.nullable(),
});

export type TxValues = z.input<typeof fields>;

const invalid = (schema: z.ZodType, value: string) => !schema.safeParse(value).success;

/** The rules that depend on other fields: a transfer needs two different accounts (and what
 * arrived, across currencies); an income or expense needs an amount and a category unless the
 * items table gives them, a currency without an account, and a rate when that currency is not
 * yours. The items themselves are checked when the request is built. */
export const transactionSchema = ({
	baseCurrency,
	accounts,
	items,
}: {
	baseCurrency: string;
	accounts: AccountRef[];
	/** Whether the items table is on: it gives the amount and the category. */
	items: boolean;
}) =>
	fields.superRefine((v, ctx) => {
		const issue = (path: keyof TxValues, message: string) =>
			ctx.addIssue({ code: "custom", path: [path], message });
		const account = accounts.find((a) => a.id === v.account_id);
		if (v.type === "transfer") {
			const to = accounts.find((a) => a.id === v.to_account_id);
			if (!account) issue("account_id", "Choose the account it leaves");
			if (!to) issue("to_account_id", "Choose the account it goes to");
			if (account && to && account.id === to.id)
				issue("to_account_id", "Choose two different accounts");
			if (invalid(positiveAmount, v.amount)) issue("amount", "Enter the amount, like 100");
			if (account && to && account.currency !== to.currency && invalid(positiveAmount, v.to_amount))
				issue("to_amount", "Enter what arrived");
			return;
		}
		if (!items) {
			if (invalid(positiveAmount, v.amount)) issue("amount", "Enter the amount, like 12.50");
			if (!v.category) issue("category", "Choose a category");
		}
		const currency = account ? account.currency : v.currency.toUpperCase();
		if (!/^[A-Z]{3}$/.test(currency)) issue("currency", "Use a 3-letter currency code");
		else if (currency !== baseCurrency && invalid(exchangeRate, v.exchange_rate))
			issue("exchange_rate", "Enter the rate");
	});

/** Where the form starts: the seed's values (a duplicate, a template, "Add another"), the edited
 * transaction's own, or a new transaction in your default account. Editing keeps the saved rate;
 * anything else leaves it empty so the market rate for the day is suggested. */
export function initialValues({
	seed,
	transaction,
	baseCurrency,
	defaultAccount,
}: {
	seed: TransactionSeed | undefined;
	transaction?: Transaction;
	baseCurrency: string;
	/** Where a brand-new transaction starts (no seed). */
	defaultAccount?: AccountRef;
}): TxValues {
	const ordinary = seed && seed.type !== "transfer" ? seed : undefined;
	const blank = !seed && defaultAccount;
	return {
		type: seed?.type ?? "expense",
		account_id: blank ? defaultAccount.id : (seed?.account?.id ?? ""),
		to_account_id: seed?.to_account?.id ?? "",
		card_id: seed?.card?.id ?? "",
		amount: seed?.amount ?? "",
		to_amount: seed?.to_amount ?? "",
		currency: blank ? defaultAccount.currency : (ordinary?.currency ?? baseCurrency),
		exchange_rate: transaction ? trimRate(transaction.exchange_rate) : (seed?.exchange_rate ?? ""),
		payment_method: blank
			? SUGGESTED_PAYMENT_METHOD[defaultAccount.group]
			: (ordinary?.payment_method ?? "cash"),
		category: ordinary?.category ?? "",
		vendor: seed?.vendorName ?? "",
		tags: seed?.tags ?? [],
		description: seed?.description ?? "",
		transaction_date: transaction?.transaction_date ?? localToday(),
		transaction_time: formatTime(transaction?.transaction_time ?? null) ?? "",
		planned: transaction?.planned ?? false,
		subscription: seed?.subscription ?? null,
		location: seed?.location ?? null,
	};
}
