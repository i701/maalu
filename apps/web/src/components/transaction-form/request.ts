import type { AccountChoice } from "./AccountPicker";
import { toScaled } from "#/lib/decimal";
import { newPlacePayload, placeOf, placePayload, type PlaceValue } from "#/lib/places";
import type { TemplateDraft } from "#/server/templates";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import type {
	Account,
	AccountRef,
	CardRef,
	Subscription,
	Transaction,
	TransactionTemplate,
} from "#/types/api";
import type { TxValues } from "./schema";
import type { SplitsState } from "./useSplits";

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
	| "card"
	| "to_account"
> & { vendorName: string; tags: string[]; location: PlaceValue | null };

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
		card: t.card,
		to_account: t.to_account,
		vendorName: t.vendor?.name ?? "",
		tags: t.tags.map((x) => x.name),
		location: placeOf(t),
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
		card: null,
		to_account: t.to_account,
		vendorName: t.vendor ?? "",
		tags: t.tags.map((x) => x.name),
		location: null,
	};
}

/** After "Add another": keep where the money goes (account, category, vendor, method), clear what
 * differs every time (the amount and the note). */
export function seedAfterSave(v: TxValues, s: State): TransactionSeed {
	const transfer = v.type === "transfer";
	return {
		type: v.type,
		amount: "",
		to_amount: null,
		payment_method: v.payment_method,
		category: !transfer && !s.splits ? v.category.trim() : "",
		description: null,
		splits: [],
		currency: s.account?.currency ?? v.currency.trim().toUpperCase(),
		exchange_rate: "",
		subscription: v.subscription,
		account: s.account,
		card: v.type === "expense" ? s.card : null,
		to_account: transfer ? s.toAccount : null,
		vendorName: transfer ? "" : v.vendor.trim(),
		tags: v.tags,
		location: transfer ? null : v.location,
	};
}

/** The form's current values (not yet checked) as a template, or a message about what is missing. */
export function buildTemplateRequest(
	v: TxValues,
	s: State,
	name: string,
): { error: string } | { draft: TemplateDraft } {
	const transfer = v.type === "transfer";
	if (transfer && (!v.account_id || !v.to_account_id))
		return {
			error: "Choose both accounts first: a transfer template needs them",
		};
	const amount = v.amount.trim();
	const category = v.category.trim();
	const vendor = v.vendor.trim();
	const description = v.description.trim();
	const currency = v.currency.trim();
	return {
		draft: {
			name,
			type: v.type,
			amount: s.splits || !amount || Number(amount) <= 0 ? undefined : amount,
			...(transfer ? {} : { payment_method: v.payment_method }),
			...(!transfer && !s.splits && category ? { category } : {}),
			...(!transfer && vendor ? { vendor_name: vendor } : {}),
			...(description ? { description } : {}),
			...(v.tags.length > 0 ? { tags: v.tags } : {}),
			...(v.account_id ? { account_id: v.account_id } : currency ? { currency } : {}),
			...(transfer && v.to_account_id ? { to_account_id: v.to_account_id } : {}),
		},
	};
}

export type SubRef = { id: string; name: string };

type Send = () => ReturnType<typeof createTransactionFn | typeof updateTransactionFn>;

/** Either a message for the user, or the request to send and what to tell them when it worked. */
export type TransactionRequest = { error: string } | { send: Send; success: string };

/** What the form's values point at, looked up: the request builders need these as well. */
export type State = {
	transaction?: Transaction;
	account: AccountRef | null;
	/** The card it was paid with, when one is picked (expenses only). */
	card: CardRef | null;
	toAccount: AccountRef | null;
	crossCurrency: boolean;
	foreign: boolean;
	/** The item table, when it is switched on (not for transfers). */
	splits: SplitsState | null;
};

function transferRequest(v: TxValues, s: State): TransactionRequest {
	const { transaction } = s;
	const fields = {
		type: v.type,
		amount: v.amount,
		transaction_date: v.transaction_date,
		transaction_time: v.transaction_time || null,
		account_id: v.account_id,
		to_account_id: v.to_account_id,
		to_amount: s.crossCurrency ? v.to_amount : undefined,
		planned: v.planned,
	};
	return {
		success: transaction
			? "Transfer updated"
			: v.planned
				? "Planned transfer added"
				: "Transfer added",
		send: () =>
			transaction
				? updateTransactionFn({
						data: {
							id: transaction.id,
							changes: { ...fields, description: v.description || null, tags: v.tags },
						},
					})
				: createTransactionFn({
						data: { ...fields, description: v.description || undefined, tags: v.tags },
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

function ordinaryRequest(v: TxValues, s: State): TransactionRequest {
	const { transaction, account, card } = s;
	const { subscription, account_id: accountId, vendor: vendorName, description } = v;
	const split = s.splits ? splitPayload(s.splits) : null;
	if (typeof split === "string") return { error: split };
	const base = {
		type: v.type,
		// With items, the amount is their total and the category comes from the biggest item.
		amount: s.splits ? s.splits.total : v.amount,
		transaction_date: v.transaction_date,
		transaction_time: v.transaction_time || null,
		currency: account ? account.currency : v.currency.toUpperCase(),
		exchange_rate: s.foreign ? v.exchange_rate : undefined,
		payment_method: v.payment_method,
		planned: v.planned,
		...(split ? { splits: split } : { category: v.category }),
	};

	if (!transaction) {
		return {
			success: v.planned ? "Planned transaction added" : "Transaction added",
			send: () =>
				createTransactionFn({
					data: {
						...base,
						description: description || undefined,
						vendor_name: vendorName || undefined,
						subscription_id: subscription?.id,
						account_id: accountId || undefined,
						card_id: card?.id,
						tags: v.tags,
						...newPlacePayload(v.location),
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
						tags: v.tags, // replaces the tags: an empty list removes them
						...placePayload(v.location), // all three null removes the location
						// changed -> link / unlink; unchanged -> omit
						...(accountId === (transaction.account?.id ?? "")
							? {}
							: { account_id: accountId || null }),
						...(card?.id === (transaction.card?.id ?? undefined)
							? {}
							: { card_id: card?.id ?? null }),
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

/** Turns the checked values plus what they point at into the create / update request. */
export function buildTransactionRequest(v: TxValues, s: State): TransactionRequest {
	return v.type === "transfer" ? transferRequest(v, s) : ordinaryRequest(v, s);
}

/** Accounts to offer. The ones the transaction is already in may have been archived since (so are
 * absent from the list); keep them, so editing the transaction doesn't blank its account. */
export function accountChoices(
	accounts: Account[],
	transaction: Transaction | undefined,
): AccountChoice[] {
	const choices: AccountChoice[] = accounts;
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
