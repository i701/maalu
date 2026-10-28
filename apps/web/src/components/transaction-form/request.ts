import { toScaled } from "#/lib/decimal";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import type { SplitsState } from "./useSplits";
import type {
	Account,
	AccountRef,
	PaymentMethod,
	Subscription,
	Transaction,
	TransactionType,
} from "#/types/api";

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
	crossCurrency: boolean;
	foreign: boolean;
	subscription: SubRef | null;
	/** The item table, when it is switched on (not for transfers). */
	splits: SplitsState | null;
};

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function transferRequest(f: FormData, s: State): TransactionRequest {
	const { transaction, accountId, toAccountId } = s;
	if (!accountId || !toAccountId) return { error: "Choose the accounts to move money between" };
	if (accountId === toAccountId) return { error: "Choose two different accounts" };

	const description = text(f, "description");
	const fields = {
		type: s.type,
		amount: text(f, "amount"),
		transaction_date: text(f, "transaction_date"),
		account_id: accountId,
		to_account_id: toAccountId,
		to_amount: s.crossCurrency ? text(f, "to_amount") : undefined,
	};
	return {
		success: transaction ? "Transfer updated" : "Transfer added",
		send: () =>
			transaction
				? updateTransactionFn({
						data: { id: transaction.id, changes: { ...fields, description: description || null } },
					})
				: createTransactionFn({ data: { ...fields, description: description || undefined } }),
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
		currency: account ? account.currency : text(f, "currency").toUpperCase(),
		exchange_rate: s.foreign ? text(f, "exchange_rate") : undefined,
		payment_method: text(f, "payment_method") as PaymentMethod,
		...(split ? { splits: split } : { category: text(f, "category") }),
	};

	if (!transaction) {
		return {
			success: "Transaction added",
			send: () =>
				createTransactionFn({
					data: {
						...base,
						description: description || undefined,
						vendor_name: vendorName || undefined,
						subscription_id: subscription?.id,
						account_id: accountId || undefined,
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
export function initialValues(transaction: Transaction | undefined, baseCurrency: string) {
	const ordinary = transaction && transaction.type !== "transfer" ? transaction : undefined;
	return {
		type: transaction?.type ?? ("expense" as TransactionType),
		accountId: transaction?.account?.id ?? "",
		toAccountId: transaction?.to_account?.id ?? "",
		currency: ordinary?.currency ?? baseCurrency,
		paymentMethod: ordinary?.payment_method ?? ("cash" as PaymentMethod),
		subscription: transaction?.subscription ?? null,
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
