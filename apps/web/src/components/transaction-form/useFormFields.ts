import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { AccountChoice } from "./AccountPicker";
import { SUGGESTED_PAYMENT_METHOD } from "#/lib/accounts";
import { cardMethod } from "#/lib/cards";
import { trimRate } from "#/lib/format";
import { isFuture, localToday } from "#/lib/planned";
import {
	isSwap,
	pickTransferEnd,
	swapTransferAmounts,
	swapTransferEnds,
	type TransferEnds,
	type TransferSide,
} from "#/lib/transfer";
import type { AccountRef, Card, Transaction, TransactionType } from "#/types/api";
import type { State, TransactionSeed } from "./request";
import { initialValues, transactionSchema, type TxValues } from "./schema";
import type { SplitsState } from "./useSplits";

/** The transaction form's values (react-hook-form) and the rules that tie them together: a card
 * sets its account and method, an account suggests a method, a future date turns on "Planned"
 * until you set it yourself. `round` changes whenever the form is cleared and refilled, so the
 * pickers that only read their starting value remount with the new one. */
export function useFormFields({
	transaction,
	startSeed,
	accounts,
	cards,
	baseCurrency,
	defaultAccount,
	splits,
}: {
	transaction: Transaction | undefined;
	/** What the form starts from: the edited transaction as a seed, or the one passed in. */
	startSeed: TransactionSeed | undefined;
	accounts: AccountChoice[];
	/** Every card, to pick one on an expense. */
	cards: Card[];
	baseCurrency: string;
	/** Where a new transaction starts, when there is one and it is still in use. */
	defaultAccount?: AccountRef;
	splits: SplitsState;
}) {
	const [filled, setFilled] = useState({ seed: startSeed, round: 0 });
	const form = useForm<TxValues>({
		resolver: zodResolver(transactionSchema({ baseCurrency, accounts, items: splits.enabled })),
		defaultValues: initialValues({
			seed: filled.seed,
			transaction,
			baseCurrency,
			defaultAccount,
		}),
	});
	const { control, getValues, reset } = form;
	// Fields these rules fill in are checked again once a save has failed, like typed ones are.
	const setValue: typeof form.setValue = (name, value) =>
		form.setValue(name, value, { shouldValidate: form.formState.isSubmitted });
	const [switched, setSwitched] = useState(false); // true once the user has changed the type
	// "Planned" follows the date until you set it yourself (an existing transaction keeps its own).
	const [plannedChosen, setPlannedChosen] = useState(Boolean(transaction));

	const [type, accountId, toAccountId, cardId, currency] = useWatch({
		control,
		name: ["type", "account_id", "to_account_id", "card_id", "currency"],
	});
	const isTransfer = type === "transfer";
	const account = accounts.find((a) => a.id === accountId) ?? null;
	const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
	// Cards are for spending: an income or transfer never carries one, so editing an older income
	// that has a card unlinks it on save.
	const card = type === "expense" ? (cards.find((c) => c.id === cardId) ?? null) : null;
	const effectiveCurrency = account ? account.currency : currency.trim().toUpperCase();
	const foreign = effectiveCurrency.length === 3 && effectiveCurrency !== baseCurrency;
	const crossCurrency = Boolean(
		isTransfer && account && toAccount && account.currency !== toAccount.currency,
	);

	/** A new currency starts its rate fresh: the seed's only when it is in that currency. */
	function rateFor(code: string) {
		const seed = filled.seed;
		if (transaction?.currency === code) return trimRate(transaction.exchange_rate);
		return seed?.currency === code ? seed.exchange_rate : "";
	}

	function currencyChanged(before: string, after: string) {
		if (before !== after) setValue("exchange_rate", rateFor(after));
	}

	function changeCurrency(typed: string) {
		const code = typed.trim().toUpperCase();
		const before = effectiveCurrency;
		setValue("currency", code);
		if (!account) currencyChanged(before, code);
	}

	function changeDate(next: string) {
		setValue("transaction_date", next);
		if (!plannedChosen) setValue("planned", isFuture(next, localToday()));
	}

	function setPlanned(on: boolean) {
		setValue("planned", on);
		setPlannedChosen(true);
	}

	function pickAccount(id: string) {
		const before = effectiveCurrency;
		setValue("account_id", id);
		const picked = accounts.find((a) => a.id === id);
		// a card belongs to its own account (read now: a card picked this moment is not rendered yet)
		const current = cards.find((c) => c.id === getValues("card_id"));
		if (current && current.account.id !== id) setValue("card_id", "");
		if (picked && !isTransfer) setValue("payment_method", SUGGESTED_PAYMENT_METHOD[picked.group]);
		currencyChanged(before, picked ? picked.currency : currency.trim().toUpperCase());
	}

	/** Picks the account on one side of a transfer. The one on the other side cannot be used twice,
	 * so picking it swaps the two, and the typed amounts with them between two currencies. */
	function pickTransferAccount(side: TransferSide, id: string) {
		const [from, to] = getValues(["account_id", "to_account_id"]);
		applyTransferEnds({ from, to }, (ends) => pickTransferEnd(ends, side, id));
	}

	/** The swap arrow: the account the money goes to becomes the one it leaves (a lone account
	 * moves to the other side). */
	function swapTransfer() {
		const [from, to] = getValues(["account_id", "to_account_id"]);
		applyTransferEnds({ from, to }, swapTransferEnds);
	}

	/** Sets the accounts to what `change` makes of the two now, and trades the typed amounts when
	 * they traded places between two currencies. */
	function applyTransferEnds(before: TransferEnds, change: (ends: TransferEnds) => TransferEnds) {
		const next = change(before);
		if (next.from !== before.from) pickAccount(next.from);
		if (next.to !== before.to) setValue("to_account_id", next.to);
		if (crossCurrency && isSwap(before, next)) {
			const [amount, toAmount] = getValues(["amount", "to_amount"]);
			const swapped = swapTransferAmounts({ amount, to_amount: toAmount }, true);
			setValue("amount", swapped.amount);
			setValue("to_amount", swapped.to_amount);
		}
	}

	/** A card spends from its account, so picking one sets the account and the method. */
	function pickCard(id: string) {
		const picked = cards.find((c) => c.id === id);
		if (picked) pickAccount(picked.account.id);
		setValue("card_id", id);
		if (picked) setValue("payment_method", cardMethod(picked.kind));
	}

	function changeType(next: TransactionType) {
		setValue("type", next);
		setSwitched(true);
		if (next !== "expense") {
			setValue("card_id", "");
			setValue("subscription", null);
		}
	}

	/** Clears the typed fields and refills the form from `next`; the date and "Planned" stay. */
	function fillFrom(next: TransactionSeed) {
		reset({
			...initialValues({ seed: next, baseCurrency }),
			transaction_date: getValues("transaction_date"),
			planned: getValues("planned"),
		});
		setFilled((f) => ({ seed: next, round: f.round + 1 }));
		setSwitched(false);
	}

	/** What the values point at, for the request builders. */
	const lookups = (): State => ({
		transaction,
		account,
		card,
		toAccount,
		crossCurrency,
		foreign,
		splits: !isTransfer && splits.enabled ? splits : null,
	});

	return {
		form,
		seed: filled.seed,
		round: filled.round,
		type,
		isTransfer,
		account,
		effectiveCurrency,
		foreign,
		crossCurrency,
		switched,
		lookups,
		changeCurrency,
		changeDate,
		setPlanned,
		pickAccount,
		pickTransferAccount,
		swapTransfer,
		pickCard,
		changeType,
		fillFrom,
	};
}
