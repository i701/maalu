import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useAction } from "#/lib/use-action";
import { createTransactionFn, updateTransactionFn } from "#/server/transactions";
import {
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	type PaymentMethod,
	type Subscription,
	type Transaction,
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

export default function TransactionForm({
	transaction,
	vendors,
	subscriptions,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new transaction */
	transaction?: Transaction;
	vendors: Vendor[];
	subscriptions: Subscription[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
	const [currency, setCurrency] = useState(transaction?.currency ?? baseCurrency);
	// The picked subscription, as a compact {id, name} (the linked one may not be in the list
	// if it was cancelled, so fall back to the transaction's own copy).
	type SubRef = { id: string; name: string };
	const [subscription, setSubscription] = useState<SubRef | null>(
		transaction?.subscription ?? null,
	);
	const subscriptionOptions: SubRef[] = subscriptions
		.filter((s) => s.status !== "cancelled" || s.id === transaction?.subscription?.id)
		.map((s) => ({ id: s.id, name: s.name }));
	const foreign = currency.length === 3 && currency.toUpperCase() !== baseCurrency;

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();

		const base = {
			amount: text("amount"),
			currency: text("currency").toUpperCase(),
			exchange_rate: foreign ? text("exchange_rate") : undefined,
			payment_method: text("payment_method") as PaymentMethod,
			category: text("category"),
			transaction_date: text("transaction_date"),
		};
		const vendorName = text("vendor");
		const description = text("description");

		const ok = await run(() =>
			transaction
				? updateTransactionFn({
						data: {
							id: transaction.id,
							changes: {
								...base,
								description: description || null,
								// changed -> link / unlink; unchanged -> omit
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
						},
					}),
		);
		if (ok) {
			notify(transaction ? "Transaction updated" : "Transaction added");
			onClose();
		}
	}

	return (
		<FormDialog
			title={transaction ? "Edit transaction" : "Add transaction"}
			error={error}
			pending={pending}
			onSubmit={submit}
			onClose={onClose}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Amount"
						name="amount"
						defaultValue={transaction?.amount}
						placeholder="-12.50"
						helperText="Negative for money out, positive for money in"
						required
						autoFocus
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<CurrencyField
						name="currency"
						label="Currency"
						currencies={currencies}
						defaultValue={transaction?.currency ?? baseCurrency}
						onInputChange={(v) => setCurrency(v.toUpperCase())}
						required
					/>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					{foreign ? (
						<TextField
							key="rate-input"
							label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
							name="exchange_rate"
							defaultValue={transaction?.currency === currency ? transaction.exchange_rate : ""}
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
						defaultValue={transaction?.payment_method ?? "cash"}
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
						label="Date"
						name="transaction_date"
						type="date"
						defaultValue={transaction?.transaction_date ?? today()}
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Category"
						name="category"
						defaultValue={transaction?.category}
						required
						slotProps={{ htmlInput: { maxLength: 100 } }}
					/>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<VendorField vendors={vendors} defaultValue={transaction?.vendor?.name ?? ""} />
				</Grid>

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
