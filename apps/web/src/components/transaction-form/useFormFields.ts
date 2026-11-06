import { useState } from "react";
import { SUGGESTED_PAYMENT_METHOD } from "#/lib/accounts";
import { cardMethod } from "#/lib/cards";
import { isFuture, localToday } from "#/lib/planned";
import type { PlaceValue } from "#/lib/places";
import type { AccountRef, Card, PaymentMethod, Transaction, TransactionType } from "#/types/api";
import { initialValues, seedFromTransaction, type SubRef, type TransactionSeed } from "./request";

/** The controlled fields of the transaction form (type, accounts, currency, method, subscription,
 * date) and what follows from them. The other fields are uncontrolled and start from `seed`;
 * `round` changes whenever the form is cleared and refilled, so they remount with new defaults. */
export function useFormFields({
	transaction,
	startSeed,
	accounts,
	cards,
	baseCurrency,
	defaultAccount,
}: {
	transaction: Transaction | undefined;
	startSeed: TransactionSeed | undefined;
	accounts: AccountRef[];
	/** Every card, to pick one on an expense. */
	cards: Card[];
	baseCurrency: string;
	/** Where a new transaction starts, when there is one and it is still in use. */
	defaultAccount?: AccountRef;
}) {
	const [filled, setFilled] = useState({
		seed: transaction ? seedFromTransaction(transaction) : startSeed,
		round: 0,
	});
	const initial = initialValues(filled.seed, baseCurrency, defaultAccount);
	const [type, setType] = useState<TransactionType>(initial.type);
	// Income / expense: an optional account locks the currency to the account's and suggests a
	// payment method. Transfer: a from-account and a to-account.
	const [accountId, setAccountId] = useState(initial.accountId);
	const [toAccountId, setToAccountId] = useState(initial.toAccountId);
	// The card it was paid with (optional): it fixes the account and suggests the method.
	const [cardId, setCardId] = useState(initial.cardId);
	const [currency, setCurrency] = useState(initial.currency);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial.paymentMethod);
	// Only expenses can belong to a subscription.
	const [subscription, setSubscription] = useState<SubRef | null>(initial.subscription);
	// The day the form is for: the exchange-rate suggestion follows it.
	const [date, setDate] = useState(transaction?.transaction_date ?? localToday());
	const [switched, setSwitched] = useState(false); // true once the user has changed the type
	// Where it happened, if marked on the map.
	const [location, setLocation] = useState<PlaceValue | null>(filled.seed?.location ?? null);
	// Planned: coming up, not happened yet. It turns on by itself when the date is in the future,
	// until you set it yourself (an existing transaction keeps what it has).
	const [planned, setPlannedState] = useState(transaction?.planned ?? false);
	const [plannedChosen, setPlannedChosen] = useState(Boolean(transaction));

	const isTransfer = type === "transfer";
	const account = accounts.find((a) => a.id === accountId) ?? null;
	const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
	// Cards are for spending: an income or transfer never carries one, so editing an older income
	// that has a card unlinks it on save.
	const card = type === "expense" ? (cards.find((c) => c.id === cardId) ?? null) : null;
	const effectiveCurrency = account ? account.currency : currency;
	const foreign =
		effectiveCurrency.length === 3 && effectiveCurrency.toUpperCase() !== baseCurrency;
	const crossCurrency = Boolean(
		isTransfer && account && toAccount && account.currency !== toAccount.currency,
	);

	function changeDate(next: string) {
		setDate(next);
		if (!plannedChosen) setPlannedState(isFuture(next, localToday()));
	}

	function setPlanned(on: boolean) {
		setPlannedState(on);
		setPlannedChosen(true);
	}

	function pickAccount(id: string) {
		setAccountId(id);
		const picked = accounts.find((a) => a.id === id);
		if (card && card.account.id !== id) setCardId(""); // a card belongs to its own account
		if (picked && !isTransfer) setPaymentMethod(SUGGESTED_PAYMENT_METHOD[picked.group]);
	}

	/** A card spends from its account, so picking one sets the account and the method. */
	function pickCard(id: string) {
		setCardId(id);
		const picked = cards.find((c) => c.id === id);
		if (!picked) return;
		setAccountId(picked.account.id);
		setPaymentMethod(cardMethod(picked.kind));
	}

	function changeType(next: TransactionType) {
		setType(next);
		if (next !== "expense") setCardId("");
		setSwitched(true);
		if (next !== "expense") setSubscription(null);
	}

	/** Clears the typed fields and refills the form from `next`. */
	function fillFrom(next: TransactionSeed) {
		const v = initialValues(next, baseCurrency);
		setFilled((f) => ({ seed: next, round: f.round + 1 }));
		setType(v.type);
		setAccountId(v.accountId);
		setToAccountId(v.toAccountId);
		setCardId(v.cardId);
		setCurrency(v.currency);
		setPaymentMethod(v.paymentMethod);
		setSubscription(v.subscription);
		setLocation(next.location);
		setSwitched(false);
	}

	return {
		seed: filled.seed,
		round: filled.round,
		type,
		isTransfer,
		accountId,
		toAccountId,
		setToAccountId,
		account,
		toAccount,
		cardId,
		card,
		pickCard,
		currency,
		setCurrency,
		effectiveCurrency,
		foreign,
		crossCurrency,
		paymentMethod,
		setPaymentMethod,
		subscription,
		setSubscription,
		date,
		changeDate,
		planned,
		setPlanned,
		switched,
		location,
		setLocation,
		pickAccount,
		changeType,
		fillFrom,
	};
}
