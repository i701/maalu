import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { type FormEvent, useState } from "react";
import { SUGGESTED_PAYMENT_METHOD } from "#/lib/accounts";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import {
	TRANSACTION_TYPES,
	TRANSACTION_TYPE_LABELS,
	type Account,
	type Category,
	type PaymentMethod,
	type Subscription,
	type Transaction,
	type TransactionType,
	type Vendor,
} from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import VendorField from "./VendorField";
import { Cell, RevealCell } from "./transaction-form/Cells";
import OrdinaryFields from "./transaction-form/OrdinaryFields";
import TransferFields from "./transaction-form/TransferFields";
import { warningAfterExpense } from "./transaction-form/budget-warning";
import { useSplits } from "./transaction-form/useSplits";
import {
	buildTransactionRequest,
	initialValues,
	subscriptionChoices,
	type SubRef,
} from "./transaction-form/request";

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const TYPE_COLOR = { income: "success", expense: "error", transfer: "info" } as const;

export default function TransactionForm({
	transaction,
	vendors,
	categories,
	subscriptions,
	accounts,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new transaction */
	transaction?: Transaction;
	vendors: Vendor[];
	categories: Category[];
	subscriptions: Subscription[];
	accounts: Account[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);
	const splits = useSplits(transaction);

	const initial = initialValues(transaction, baseCurrency);
	const [type, setType] = useState<TransactionType>(initial.type);
	const isTransfer = type === "transfer";

	// Income / expense: an optional account locks the currency to the account's and suggests a
	// payment method. Transfer: a from-account and a to-account.
	const [accountId, setAccountId] = useState(initial.accountId);
	const [toAccountId, setToAccountId] = useState(initial.toAccountId);
	const account = accounts.find((a) => a.id === accountId) ?? null;
	const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
	const [currency, setCurrency] = useState(initial.currency);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial.paymentMethod);
	// Only expenses can belong to a subscription.
	const [subscription, setSubscription] = useState<SubRef | null>(initial.subscription);
	const subscriptionOptions = subscriptionChoices(subscriptions, transaction);

	const [switched, setSwitched] = useState(false); // true once the user has changed the type
	const effectiveCurrency = account ? account.currency : currency;
	const foreign =
		effectiveCurrency.length === 3 && effectiveCurrency.toUpperCase() !== baseCurrency;
	const crossCurrency =
		isTransfer && account && toAccount && account.currency !== toAccount.currency;

	function pickAccount(id: string) {
		setAccountId(id);
		const picked = accounts.find((a) => a.id === id);
		if (picked && !isTransfer) setPaymentMethod(SUGGESTED_PAYMENT_METHOD[picked.group]);
	}

	function changeType(next: TransactionType) {
		setType(next);
		setSwitched(true);
		if (next !== "expense") setSubscription(null);
		setLocalError(null);
	}

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget); // read now: the event is gone after an await
		const request = buildTransactionRequest(form, {
			type,
			transaction,
			accountId,
			toAccountId,
			account,
			crossCurrency: Boolean(crossCurrency),
			foreign,
			subscription,
			splits: type !== "transfer" && splits.enabled ? splits : null,
		});
		if ("error" in request) return setLocalError(request.error);
		setLocalError(null);
		if (await run(request.send)) {
			// An expense may have pushed a budget limit close or over: say so in the same message.
			const warning =
				type === "expense"
					? await warningAfterExpense({
							date: String(form.get("transaction_date") ?? ""),
							categories: splits.enabled
								? splits.rows.map((r) => r.category)
								: [String(form.get("category") ?? "")],
						})
					: null;
			notify(
				warning ? `${request.success}. ${warning}` : request.success,
				warning ? "warning" : "success",
			);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={transaction ? "Edit transaction" : "Add transaction"}
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container columnSpacing={2}>
				<Cell size={12}>
					<ToggleButtonGroup
						exclusive
						fullWidth
						size="small"
						value={type}
						onChange={(_, next: TransactionType | null) => next && changeType(next)}
						aria-label="Transaction type"
					>
						{TRANSACTION_TYPES.map((t) => (
							<ToggleButton key={t} value={t} color={TYPE_COLOR[t]} sx={{ py: 1 }}>
								{TRANSACTION_TYPE_LABELS[t]}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
				</Cell>

				{isTransfer ? (
					<TransferFields
						key="transfer"
						accounts={accounts}
						accountId={accountId}
						toAccountId={toAccountId}
						onPickAccount={pickAccount}
						onPickToAccount={setToAccountId}
						crossCurrency={Boolean(crossCurrency)}
						transaction={transaction}
						switched={switched}
					/>
				) : (
					<OrdinaryFields
						key="ordinary"
						type={type}
						accounts={accounts}
						accountId={accountId}
						onPickAccount={pickAccount}
						currencies={currencies}
						currency={currency}
						onCurrencyChange={setCurrency}
						effectiveCurrency={effectiveCurrency}
						foreign={foreign}
						baseCurrency={baseCurrency}
						paymentMethod={paymentMethod}
						onPaymentMethodChange={setPaymentMethod}
						transaction={transaction}
						switched={switched}
						splits={splits}
						categories={categories}
					/>
				)}

				<Cell size={{ xs: 12, sm: isTransfer ? 12 : 6 }}>
					<TextField
						label="Date"
						name="transaction_date"
						type="date"
						defaultValue={transaction?.transaction_date ?? today()}
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Cell>

				<RevealCell size={{ xs: 12, sm: 6 }} show={!isTransfer}>
					<VendorField vendors={vendors} defaultValue={transaction?.vendor?.name ?? ""} />
				</RevealCell>

				<RevealCell size={12} show={type === "expense"}>
					<Autocomplete
						options={subscriptionOptions}
						value={subscription}
						onChange={(_, v) => setSubscription(v)}
						getOptionLabel={(o) => o.name}
						isOptionEqualToValue={(a, b) => a.id === b.id}
						noOptionsText="No subscriptions yet"
						renderInput={(params) => (
							<TextField
								{...params}
								label="Subscription"
								helperText="Optional. Marks this as a payment for a recurring charge"
							/>
						)}
					/>
				</RevealCell>

				<Cell size={12}>
					<TextField
						label="Description"
						name="description"
						defaultValue={transaction?.description ?? ""}
						multiline
						minRows={2}
					/>
				</Cell>
			</Grid>
		</FormDialog>
	);
}
