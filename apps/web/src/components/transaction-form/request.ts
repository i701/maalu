import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import type {
	Account,
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
	account: Account | null;
	crossCurrency: boolean;
	foreign: boolean;
	subscription: SubRef | null;
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

function ordinaryRequest(f: FormData, s: State): TransactionRequest {
	const { transaction, accountId, account, subscription } = s;
	const description = text(f, "description");
	const vendorName = text(f, "vendor");
	const base = {
		type: s.type,
		amount: text(f, "amount"),
		transaction_date: text(f, "transaction_date"),
		currency: account ? account.currency : text(f, "currency").toUpperCase(),
		exchange_rate: s.foreign ? text(f, "exchange_rate") : undefined,
		payment_method: text(f, "payment_method") as PaymentMethod,
		category: text(f, "category"),
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

/** Subscriptions to offer. The linked one may be cancelled (so absent from the list); keep it. */
export function subscriptionChoices(
	subscriptions: Subscription[],
	transaction: Transaction | undefined,
): SubRef[] {
	return subscriptions
		.filter((s) => s.status !== "cancelled" || s.id === transaction?.subscription?.id)
		.map((s) => ({ id: s.id, name: s.name }));
}
