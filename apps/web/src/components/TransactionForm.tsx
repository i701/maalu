import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useState } from "react";
import { SUGGESTED_PAYMENT_METHOD } from "#/lib/accounts";
import { useAction } from "#/lib/use-action";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import {
	ACCOUNT_GROUP_LABELS,
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	TRANSACTION_TYPES,
	TRANSACTION_TYPE_LABELS,
	type Account,
	type PaymentMethod,
	type Subscription,
	type Transaction,
	type TransactionType,
	type Vendor,
} from "#/types/api";
import CurrencyField from "./CurrencyField";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import VendorField from "./VendorField";

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const TYPE_COLOR = { income: "success", expense: "error", transfer: "info" } as const;

type SubRef = { id: string; name: string };

export default function TransactionForm({
	transaction,
	vendors,
	subscriptions,
	accounts,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new transaction */
	transaction?: Transaction;
	vendors: Vendor[];
	subscriptions: Subscription[];
	accounts: Account[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);

	const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
	const isTransfer = type === "transfer";

	// Income / expense: an optional account locks the currency to the account's and suggests a
	// payment method. Transfer: a from-account and a to-account.
	const [accountId, setAccountId] = useState(transaction?.account?.id ?? "");
	const [toAccountId, setToAccountId] = useState(transaction?.to_account?.id ?? "");
	const account = accounts.find((a) => a.id === accountId) ?? null;
	const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
	const [currency, setCurrency] = useState(
		transaction && transaction.type !== "transfer" ? transaction.currency : baseCurrency,
	);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
		transaction && transaction.type !== "transfer" ? transaction.payment_method : "cash",
	);
	// Only expenses can belong to a subscription. The linked one may not be in the list if it was
	// cancelled, so fall back to the transaction's own copy.
	const [subscription, setSubscription] = useState<SubRef | null>(
		transaction?.subscription ?? null,
	);
	const subscriptionOptions: SubRef[] = subscriptions
		.filter((s) => s.status !== "cancelled" || s.id === transaction?.subscription?.id)
		.map((s) => ({ id: s.id, name: s.name }));

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
		if (next !== "expense") setSubscription(null);
		setLocalError(null);
	}

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const description = text("description");
		const common = {
			type,
			amount: text("amount"),
			transaction_date: text("transaction_date"),
		};

		if (isTransfer) {
			if (!accountId || !toAccountId)
				return setLocalError("Choose the accounts to move money between");
			if (accountId === toAccountId) return setLocalError("Choose two different accounts");
			const fields = {
				...common,
				account_id: accountId,
				to_account_id: toAccountId,
				to_amount: crossCurrency ? text("to_amount") : undefined,
			};
			setLocalError(null);
			const ok = await run(() =>
				transaction
					? updateTransactionFn({
							data: {
								id: transaction.id,
								changes: { ...fields, description: description || null },
							},
						})
					: createTransactionFn({ data: { ...fields, description: description || undefined } }),
			);
			if (ok) {
				notify(transaction ? "Transfer updated" : "Transfer added");
				onClose();
			}
			return;
		}

		const base = {
			...common,
			currency: account ? account.currency : text("currency").toUpperCase(),
			exchange_rate: foreign ? text("exchange_rate") : undefined,
			payment_method: text("payment_method") as PaymentMethod,
			category: text("category"),
		};
		const vendorName = text("vendor");
		setLocalError(null);

		const ok = await run(() =>
			transaction
				? updateTransactionFn({
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
					})
				: createTransactionFn({
						data: {
							...base,
							description: description || undefined,
							vendor_name: vendorName || undefined,
							subscription_id: subscription?.id,
							account_id: accountId || undefined,
						},
					}),
		);
		if (ok) {
			notify(transaction ? "Transaction updated" : "Transaction added");
			onClose();
		}
	}

	const accountOptions = (exclude?: string) =>
		accounts
			.filter((a) => a.id !== exclude)
			.map((a) => (
				<MenuItem key={a.id} value={a.id}>
					{a.name} · {ACCOUNT_GROUP_LABELS[a.group]} · {a.currency}
				</MenuItem>
			));

	return (
		<FormDialog
			title={transaction ? "Edit transaction" : "Add transaction"}
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			onClose={onClose}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
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
				</Grid>

				{isTransfer ? (
					<>
						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								select
								label="From"
								value={accountId}
								onChange={(e) => pickAccount(e.target.value)}
								required
							>
								{accountOptions(toAccountId)}
							</TextField>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								select
								label="To"
								value={toAccountId}
								onChange={(e) => setToAccountId(e.target.value)}
								required
							>
								{accountOptions(accountId)}
							</TextField>
						</Grid>
						{accounts.length < 2 && (
							<Grid size={12}>
								<Alert severity="info">
									Add at least two accounts on the Accounts page to make a transfer.
								</Alert>
							</Grid>
						)}
						<Grid size={{ xs: 12, sm: crossCurrency ? 6 : 12 }}>
							<TextField
								label={account ? `Amount (${account.currency})` : "Amount"}
								name="amount"
								defaultValue={transaction?.amount}
								placeholder="100.00"
								helperText="Taken out of the From account"
								required
								autoFocus
								slotProps={{ htmlInput: { inputMode: "decimal" } }}
							/>
						</Grid>
						{crossCurrency && toAccount && (
							<Grid size={{ xs: 12, sm: 6 }}>
								<TextField
									label={`Amount received (${toAccount.currency})`}
									name="to_amount"
									defaultValue={transaction?.to_amount ?? ""}
									placeholder="10.00"
									helperText="Different currencies: enter what arrived"
									required
									slotProps={{ htmlInput: { inputMode: "decimal" } }}
								/>
							</Grid>
						)}
					</>
				) : (
					<>
						<Grid size={12}>
							<TextField
								label="Amount"
								name="amount"
								defaultValue={transaction?.amount}
								placeholder="12.50"
								helperText={type === "income" ? "Money received" : "Money spent"}
								required
								autoFocus
								slotProps={{ htmlInput: { inputMode: "decimal" } }}
							/>
						</Grid>

						<Grid size={12}>
							<TextField
								select
								label="Account"
								value={accountId}
								onChange={(e) => pickAccount(e.target.value)}
								helperText={
									account
										? `Uses the account's currency (${account.currency}) and updates its balance`
										: "Optional. Choose where the money moved"
								}
							>
								<MenuItem value="">None</MenuItem>
								{accountOptions()}
							</TextField>
						</Grid>

						<Grid size={{ xs: 12, sm: 6 }}>
							{account ? (
								<TextField
									key="currency-locked"
									label="Currency"
									value={account.currency}
									disabled
								/>
							) : (
								<CurrencyField
									key="currency-free"
									name="currency"
									label="Currency"
									currencies={currencies}
									defaultValue={currency}
									onInputChange={(v) => setCurrency(v.toUpperCase())}
									required
								/>
							)}
						</Grid>

						<Grid size={{ xs: 12, sm: 6 }}>
							{foreign ? (
								<TextField
									key={`rate-${effectiveCurrency}`}
									label={`Rate: 1 ${effectiveCurrency} = ? ${baseCurrency}`}
									name="exchange_rate"
									defaultValue={
										transaction?.currency === effectiveCurrency ? transaction.exchange_rate : ""
									}
									placeholder="15.42"
									required
									slotProps={{ htmlInput: { inputMode: "decimal" } }}
								/>
							) : (
								<TextField
									key="rate-base"
									label="Rate"
									value={`1 (${baseCurrency}, your base currency)`}
									disabled
								/>
							)}
						</Grid>

						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								select
								label="Payment method"
								name="payment_method"
								value={paymentMethod}
								onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
								required
							>
								{PAYMENT_METHODS.map((m) => (
									<MenuItem key={m} value={m}>
										{PAYMENT_METHOD_LABELS[m]}
									</MenuItem>
								))}
							</TextField>
						</Grid>

						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								label="Category"
								name="category"
								defaultValue={
									transaction && transaction.type !== "transfer" ? transaction.category : ""
								}
								required
								slotProps={{ htmlInput: { maxLength: 100 } }}
							/>
						</Grid>
					</>
				)}

				<Grid size={{ xs: 12, sm: isTransfer ? 12 : 6 }}>
					<TextField
						label="Date"
						name="transaction_date"
						type="date"
						defaultValue={transaction?.transaction_date ?? today()}
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>

				{!isTransfer && (
					<Grid size={{ xs: 12, sm: 6 }}>
						<VendorField vendors={vendors} defaultValue={transaction?.vendor?.name ?? ""} />
					</Grid>
				)}

				{type === "expense" && (
					<Grid size={12}>
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
					</Grid>
				)}

				<Grid size={12}>
					<TextField
						label="Description"
						name="description"
						defaultValue={transaction?.description ?? ""}
						multiline
						minRows={2}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
