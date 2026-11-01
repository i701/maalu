import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createSubscriptionFn, updateSubscriptionFn } from "#/server/subscriptions";
import {
	INTERVAL_UNITS,
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	SUBSCRIPTION_STATUSES,
	SUBSCRIPTION_STATUS_LABELS,
	type Account,
	type Category,
	type IntervalUnit,
	type PaymentMethod,
	type Subscription,
	type SubscriptionStatus,
	type Vendor,
} from "#/types/api";
import CategoryField from "./CategoryField";
import CurrencyField from "./CurrencyField";
import FormDialog from "./FormDialog";
import { accountMenuItems } from "./transaction-form/accountMenuItems";
import { useNotify } from "./Notify";
import RateField from "./RateField";
import VendorField from "./VendorField";

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

/** Only what changed: omitted when the same, `null` to unlink. */
function accountChange(subscription: Subscription, accountId: string) {
	return accountId === (subscription.account?.id ?? "") ? {} : { account_id: accountId || null };
}

/** Unchanged -> omit; cleared -> unlink; otherwise find-or-create by name. */
function vendorChange(subscription: Subscription, vendorName: string) {
	if (vendorName === (subscription.vendor?.name ?? "")) return {};
	return vendorName ? { vendor_name: vendorName } : { vendor_id: null };
}

function readFields(f: FormData, account: Account | null, foreign: boolean) {
	const text = (k: string) => String(f.get(k) ?? "").trim();
	return {
		name: text("name"),
		amount: text("amount"),
		currency: account ? account.currency : text("currency").toUpperCase(),
		exchange_rate: foreign ? text("exchange_rate") : undefined,
		payment_method: text("payment_method") as PaymentMethod,
		category: text("category"),
		interval_unit: text("interval_unit") as IntervalUnit,
		interval_count: Number(text("interval_count")),
		start_date: text("start_date"),
		status: text("status") as SubscriptionStatus,
	};
}

/** Creates the subscription, or sends only what changed on an existing one. */
function save(
	subscription: Subscription | undefined,
	f: FormData,
	account: Account | null,
	foreign: boolean,
) {
	const base = readFields(f, account, foreign);
	const vendorName = String(f.get("vendor") ?? "").trim();
	if (subscription) {
		return updateSubscriptionFn({
			data: {
				id: subscription.id,
				changes: {
					...base,
					...accountChange(subscription, account?.id ?? ""),
					...vendorChange(subscription, vendorName),
				},
			},
		});
	}
	return createSubscriptionFn({
		data: {
			...base,
			...(account ? { account_id: account.id } : {}),
			vendor_name: vendorName || undefined,
		},
	});
}

function MoneyFields({
	subscription,
	accounts,
	account,
	onAccountChange,
	currencies,
	currency,
	onCurrencyChange,
	baseCurrency,
	startDate,
	foreign,
}: {
	subscription?: Subscription;
	accounts: Account[];
	account: Account | null;
	onAccountChange: (id: string) => void;
	currencies: string[];
	currency: string;
	onCurrencyChange: (currency: string) => void;
	baseCurrency: string;
	startDate: string;
	foreign: boolean;
}) {
	return (
		<>
			<Grid size={12}>
				<TextField
					select
					label="Pay from"
					value={account?.id ?? ""}
					onChange={(e) => onAccountChange(e.target.value)}
					helperText={
						account
							? `Planned payments go in this account, in ${account.currency}`
							: "Optional. The account its planned payments are made in"
					}
				>
					<MenuItem value="">None</MenuItem>
					{accountMenuItems(accounts)}
				</TextField>
			</Grid>

			<Grid size={{ xs: 12, sm: 6 }}>
				<TextField
					label="Cost per cycle"
					name="amount"
					defaultValue={subscription?.amount}
					placeholder="99.00"
					helperText="Always a positive amount"
					required
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</Grid>

			<Grid size={{ xs: 12, sm: 6 }}>
				{account ? (
					<TextField key="currency-locked" label="Currency" value={account.currency} disabled />
				) : (
					<CurrencyField
						key="currency-free"
						name="currency"
						label="Currency"
						currencies={currencies}
						defaultValue={currency}
						onInputChange={(v) => onCurrencyChange(v.toUpperCase())}
						required
					/>
				)}
			</Grid>

			{foreign && (
				<Grid size={12}>
					<RateField
						key={`rate-${currency}`}
						from={currency}
						to={baseCurrency}
						on={startDate}
						label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
						initial={subscription?.currency === currency ? subscription.exchange_rate : ""}
					/>
				</Grid>
			)}
		</>
	);
}

export default function SubscriptionForm({
	subscription,
	accounts,
	vendors,
	categories,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new subscription */
	subscription?: Subscription;
	/** The accounts it can be paid from (not archived) */
	accounts: Account[];
	vendors: Vendor[];
	categories: Category[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [currency, setCurrency] = useState(subscription?.currency ?? baseCurrency);
	// The first billing date: the exchange-rate suggestion follows it.
	const [startDate, setStartDate] = useState(subscription?.start_date ?? today());
	const [accountId, setAccountId] = useState(subscription?.account?.id ?? "");
	const account = accounts.find((a) => a.id === accountId) ?? null;
	// An account brings its own currency and rate, so nothing is typed for them.
	const foreign = !account && currency.length === 3 && currency.toUpperCase() !== baseCurrency;

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const ok = await run(() => save(subscription, f, account, foreign));
		if (ok) {
			notify(subscription ? "Subscription updated" : "Subscription added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={subscription ? "Edit subscription" : "Add subscription"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label="Name"
						name="name"
						defaultValue={subscription?.name}
						placeholder="Netflix"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>

				<MoneyFields
					subscription={subscription}
					accounts={accounts}
					account={account}
					onAccountChange={setAccountId}
					currencies={currencies}
					currency={currency}
					onCurrencyChange={setCurrency}
					baseCurrency={baseCurrency}
					startDate={startDate}
					foreign={foreign}
				/>

				<Grid size={{ xs: 5, sm: 4 }}>
					<TextField
						label="Every"
						name="interval_count"
						type="number"
						defaultValue={subscription?.interval_count ?? 1}
						required
						slotProps={{ htmlInput: { min: 1, max: 120 } }}
					/>
				</Grid>
				<Grid size={{ xs: 7, sm: 8 }}>
					<TextField
						select
						label="Billing period"
						name="interval_unit"
						defaultValue={subscription?.interval_unit ?? "month"}
						required
					>
						{INTERVAL_UNITS.map((u) => (
							<MenuItem key={u} value={u}>
								{u[0].toUpperCase() + u.slice(1)}(s)
							</MenuItem>
						))}
					</TextField>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="First billing date"
						name="start_date"
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						helperText="Anchors the schedule, e.g. the 1st of each month"
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						select
						label="Status"
						name="status"
						defaultValue={subscription?.status ?? "active"}
						required
					>
						{SUBSCRIPTION_STATUSES.map((s) => (
							<MenuItem key={s} value={s}>
								{SUBSCRIPTION_STATUS_LABELS[s]}
							</MenuItem>
						))}
					</TextField>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						select
						label="Payment method"
						name="payment_method"
						defaultValue={subscription?.payment_method ?? "debit_card"}
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
					<CategoryField
						categories={categories}
						name="category"
						defaultValue={subscription?.category ?? ""}
					/>
				</Grid>

				<Grid size={12}>
					<VendorField vendors={vendors} defaultValue={subscription?.vendor?.name ?? ""} />
				</Grid>
			</Grid>
		</FormDialog>
	);
}
