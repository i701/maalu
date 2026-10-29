import { SUGGESTED_PAYMENT_METHOD } from "#/lib/accounts";
import { toScaled } from "#/lib/decimal";
import type { TemplateDraft } from "#/server/templates";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import type { SplitsState } from "./useSplits";
import type {
	Account,
	AccountRef,
	PaymentMethod,
	Subscription,
	Transaction,
	TransactionTemplate,
	TransactionType,
} from "#/types/api";

/** What the form starts from when it is not editing a transaction: a duplicate of one, a template,
 * or what was just saved ("Add another"). Only the fields the form pre-fills. */
export type TransactionSeed = Pick<
	Transaction,
	| "type"
	| "amount"
	| "to_amount"
	| "payment_method"
	| "category"
	| "description"
	| "splits"
	| "currency"
	| "exchange_rate"
	| "subscription"
	| "account"
	| "to_account"
> & { vendorName: string; tags: string[] };

/** "45.0000" as "45", "12.5000" as "12.5": the API sends four decimals, a person types fewer. */
const trimZeros = (amount: string) =>
	amount.includes(".") ? amount.replace(/\.?0+$/, "") : amount;

/** The same details as an existing transaction, as the start of a new one. The rate is left empty
 * so the market rate for the new date is suggested instead of reusing the old one. */
export function seedFromTransaction(t: Transaction): TransactionSeed {
	return {
		type: t.type,
		amount: trimZeros(t.amount),
		to_amount: t.to_amount && trimZeros(t.to_amount),
		payment_method: t.payment_method,
		category: t.category,
		description: t.description,
		splits: t.splits,
		currency: t.currency,
		exchange_rate: "",
		subscription: t.subscription,
		account: t.account,
		to_account: t.to_account,
		vendorName: t.vendor?.name ?? "",
		tags: t.tags.map((x) => x.name),
	};
}

export function seedFromTemplate(t: TransactionTemplate): TransactionSeed {
	return {
		type: t.type,
		amount: t.amount ? trimZeros(t.amount) : "",
		to_amount: null,
		payment_method: t.payment_method,
		category: t.category ?? "",
		description: t.description,
		splits: [],
		currency: t.currency,
		exchange_rate: "",
		subscription: null,
		account: t.account,
		to_account: t.to_account,
		vendorName: t.vendor ?? "",
		tags: t.tags.map((x) => x.name),
	};
}

/** After "Add another": keep where the money goes (account, category, vendor, method), clear what
 * differs every time (the amount and the note). */
export function seedAfterSave(f: FormData, s: State): TransactionSeed {
	const keepItems = s.type !== "transfer" && !s.splits;
	return {
		type: s.type,
		amount: "",
		to_amount: null,
		payment_method: (text(f, "payment_method") || "cash") as PaymentMethod,
		category: keepItems ? text(f, "category") : "",
		description: null,
		splits: [],
		currency: s.account?.currency ?? text(f, "currency").toUpperCase(),
		exchange_rate: "",
		subscription: s.subscription,
		account: s.account,
		to_account: s.type === "transfer" ? s.toAccount : null,
		vendorName: s.type === "transfer" ? "" : text(f, "vendor"),
		tags: tagNames(f),
	};
}

/** The form's current values as a template, or a message about what is missing. */
export function buildTemplateRequest(
	f: FormData,
	s: State,
	name: string,
): { error: string } | { draft: TemplateDraft } {
	const transfer = s.type === "transfer";
	if (transfer && (!s.accountId || !s.toAccountId))
		return { error: "Choose both accounts first: a transfer template needs them" };
	const amount = text(f, "amount");
	const category = text(f, "category");
	const vendor = text(f, "vendor");
	const description = text(f, "description");
	const currency = text(f, "currency");
	return {
		draft: {
			name,
			type: s.type,
			amount: s.splits || !amount || Number(amount) <= 0 ? undefined : amount,
			...(transfer ? {} : { payment_method: text(f, "payment_method") as PaymentMethod }),
			...(!transfer && !s.splits && category ? { category } : {}),
			...(!transfer && vendor ? { vendor_name: vendor } : {}),
			...(description ? { description } : {}),
			...(tagNames(f).length > 0 ? { tags: tagNames(f) } : {}),
			...(s.accountId ? { account_id: s.accountId } : currency ? { currency } : {}),
			...(transfer && s.toAccountId ? { to_account_id: s.toAccountId } : {}),
		},
	};
}

export type SubRef = { id: string; name: string };

type Send = () => ReturnType<typeof createTransactionFn | typeof updateTransactionFn>;

/** Either a message for the user, or the request to send and what to tell them when it worked. */
export type TransactionRequest = { error: string } | { send: Send; success: string };

type State = {
	type: TransactionType;
	transaction?: Transaction;
	accountId: string;
	toAccountId: string;
	account: AccountRef | null;
	toAccount: AccountRef | null;
	crossCurrency: boolean;
	foreign: boolean;
	subscription: SubRef | null;
	/** Coming up, not happened yet: counts toward nothing until it is marked as paid. */
	planned: boolean;
	/** The item table, when it is switched on (not for transfers). */
	splits: SplitsState | null;
};

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const tagNames = (f: FormData) => f.getAll("tags").map((v) => String(v));

function transferRequest(f: FormData, s: State): TransactionRequest {
	const { transaction, accountId, toAccountId } = s;
	if (!accountId || !toAccountId) return { error: "Choose the accounts to move money between" };
	if (accountId === toAccountId) return { error: "Choose two different accounts" };

	const description = text(f, "description");
	const fields = {
		type: s.type,
		amount: text(f, "amount"),
		transaction_date: text(f, "transaction_date"),
		transaction_time: text(f, "transaction_time") || null,
		account_id: accountId,
		to_account_id: toAccountId,
		to_amount: s.crossCurrency ? text(f, "to_amount") : undefined,
		planned: s.planned,
	};
	return {
		success: transaction
			? "Transfer updated"
			: s.planned
				? "Planned transfer added"
				: "Transfer added",
		send: () =>
			transaction
				? updateTransactionFn({
						data: {
							id: transaction.id,
							changes: { ...fields, description: description || null, tags: tagNames(f) },
						},
					})
				: createTransactionFn({
						data: { ...fields, description: description || undefined, tags: tagNames(f) },
					}),
	};
}

/** The rows as the API wants them, or a message (a string) about the first thing wrong with them. */
function splitPayload(splits: SplitsState) {
	const { rows, lines, mode, rate } = splits;
	if (mode !== "none" && !(Number(rate) > 0 && toScaled(rate, 4) !== null))
		return "Enter the GST rate, for example 8";
	const payload = [];
	for (const [i, row] of rows.entries()) {
		const line = lines[i];
		const label = row.name.trim() || `Item ${i + 1}`;
		if (!row.name.trim()) return `Item ${i + 1} needs a name`;
		if (!row.category.trim()) return `${label} needs a category`;
		if (!line) return `${label} needs a quantity and a price`;
		payload.push({
			name: row.name.trim(),
			quantity: row.quantity.trim(),
			category: row.category.trim(),
			amount: line.amount,
			tax_amount: line.tax,
		});
	}
	return payload;
}

function ordinaryRequest(f: FormData, s: State): TransactionRequest {
	const { transaction, accountId, account, subscription } = s;
	const description = text(f, "description");
	const vendorName = text(f, "vendor");
	const split = s.splits ? splitPayload(s.splits) : null;
	if (typeof split === "string") return { error: split };
	const base = {
		type: s.type,
		// With items, the amount is their total and the category comes from the biggest item.
		amount: s.splits ? s.splits.total : text(f, "amount"),
		transaction_date: text(f, "transaction_date"),
		transaction_time: text(f, "transaction_time") || null,
		currency: account ? account.currency : text(f, "currency").toUpperCase(),
		exchange_rate: s.foreign ? text(f, "exchange_rate") : undefined,
		payment_method: text(f, "payment_method") as PaymentMethod,
		planned: s.planned,
		...(split ? { splits: split } : { category: text(f, "category") }),
	};

	if (!transaction) {
		return {
			success: s.planned ? "Planned transaction added" : "Transaction added",
			send: () =>
				createTransactionFn({
					data: {
						...base,
						description: description || undefined,
						vendor_name: vendorName || undefined,
						subscription_id: subscription?.id,
						account_id: accountId || undefined,
						tags: tagNames(f),
					},
				}),
		};
	}

	return {
		success: "Transaction updated",
		send: () =>
			updateTransactionFn({
				data: {
					id: transaction.id,
					changes: {
						...base,
						// switching the items off on a split transaction removes them
						...(!split && transaction.splits.length > 0 ? { splits: null } : {}),
						description: description || null,
						tags: tagNames(f), // replaces the tags: an empty list removes them
						// changed -> link / unlink; unchanged -> omit
						...(accountId === (transaction.account?.id ?? "")
							? {}
							: { account_id: accountId || null }),
						...(subscription?.id === (transaction.subscription?.id ?? undefined)
							? {}
							: { subscription_id: subscription?.id ?? null }),
						// unchanged -> omit; cleared -> unlink; otherwise find-or-create by name
						...(vendorName === (transaction.vendor?.name ?? "")
							? {}
							: vendorName
								? { vendor_name: vendorName }
								: { vendor_id: null }),
					},
				},
			}),
	};
}

/** Turns the submitted form plus the controlled state into the create / update request. */
export function buildTransactionRequest(form: FormData, state: State): TransactionRequest {
	return state.type === "transfer" ? transferRequest(form, state) : ordinaryRequest(form, state);
}

/** Starting values for the controlled fields: the edited transaction's, or sensible defaults. */
export function initialValues(
	seed: TransactionSeed | undefined,
	baseCurrency: string,
	/** Where a brand-new transaction starts (no seed). */
	defaultAccount?: AccountRef,
) {
	if (!seed && defaultAccount)
		return {
			type: "expense" as TransactionType,
			accountId: defaultAccount.id,
			toAccountId: "",
			currency: defaultAccount.currency,
			paymentMethod: SUGGESTED_PAYMENT_METHOD[defaultAccount.group],
			subscription: null,
		};
	const ordinary = seed && seed.type !== "transfer" ? seed : undefined;
	return {
		type: seed?.type ?? ("expense" as TransactionType),
		accountId: seed?.account?.id ?? "",
		toAccountId: seed?.to_account?.id ?? "",
		currency: ordinary?.currency ?? baseCurrency,
		paymentMethod: ordinary?.payment_method ?? ("cash" as PaymentMethod),
		subscription: seed?.subscription ?? null,
	};
}

/** Accounts to offer. The ones the transaction is already in may have been archived since (so are
 * absent from the list); keep them, so editing the transaction doesn't blank its account. */
export function accountChoices(
	accounts: Account[],
	transaction: Transaction | undefined,
): AccountRef[] {
	const choices: AccountRef[] = accounts;
	const own = [transaction?.account, transaction?.to_account].filter(
		(a): a is AccountRef => a != null && !accounts.some((x) => x.id === a.id),
	);
	return [...choices, ...own];
}

/** Subscriptions to offer. The linked one may be cancelled (so absent from the list); keep it. */
export function subscriptionChoices(
	subscriptions: Subscription[],
	transaction: Transaction | undefined,
): SubRef[] {
	return subscriptions
		.filter((s) => s.status !== "cancelled" || s.id === transaction?.subscription?.id)
		.map((s) => ({ id: s.id, name: s.name }));
}
