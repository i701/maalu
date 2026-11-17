import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type Control, Controller, type UseFormSetValue, useForm, useWatch } from "react-hook-form";
import { useSheet } from "#/lib/sheet";
import { installmentsFromField, REMIND_OPTIONS, remindFromField } from "#/lib/subscription";
import { useAction } from "#/lib/use-action";
import { createSubscriptionFn, updateSubscriptionFn } from "#/server/subscriptions";
import {
	type Account,
	type Category,
	INTERVAL_UNITS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	SUBSCRIPTION_STATUS_LABELS,
	SUBSCRIPTION_STATUSES,
	type Subscription,
	type Vendor,
} from "#/types/api";
import CategoryField from "./CategoryField";
import CurrencyField from "./CurrencyField";
import FormDialog from "./FormDialog";
import FormSwitch from "./FormSwitch";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";
import RateField from "./RateField";
import {
	type SubscriptionFormInput,
	type SubscriptionFormOutput,
	subscriptionDefaults,
	subscriptionSchema,
} from "./subscription-form";
import AccountPicker from "./transaction-form/AccountPicker";
import VendorField from "./VendorField";

type FormControl = Control<SubscriptionFormInput, unknown, SubscriptionFormOutput>;

/** Only what changed: omitted when the same, `null` to unlink. */
function accountChange(subscription: Subscription, accountId: string) {
	return accountId === (subscription.account?.id ?? "") ? {} : { account_id: accountId || null };
}

/** Unchanged -> omit; cleared -> unlink; otherwise find-or-create by name. */
function vendorChange(subscription: Subscription, vendorName: string) {
	if (vendorName === (subscription.vendor?.name ?? "")) return {};
	return vendorName ? { vendor_name: vendorName } : { vendor_id: null };
}

/** Creates the subscription, or sends only what changed on an existing one. */
function save(
	subscription: Subscription | undefined,
	v: SubscriptionFormOutput,
	account: Account | null,
	baseCurrency: string,
) {
	const currency = account ? account.currency : v.currency.toUpperCase();
	const base = {
		name: v.name,
		amount: v.amount,
		currency,
		exchange_rate: !account && currency !== baseCurrency ? v.exchange_rate : undefined,
		payment_method: v.payment_method,
		category: v.category,
		interval_unit: v.interval_unit,
		interval_count: v.interval_count,
		start_date: v.start_date,
		status: v.status,
		installments_total: installmentsFromField(v.installments_total),
		remind_days_before: remindFromField(v.remind_days_before),
		amount_varies: v.amount_varies,
	};
	if (subscription) {
		return updateSubscriptionFn({
			data: {
				id: subscription.id,
				changes: {
					...base,
					// the form's own id: an archived account is not in `accounts`, and must stay linked
					...accountChange(subscription, v.account_id),
					...vendorChange(subscription, v.vendor),
				},
			},
		});
	}
	return createSubscriptionFn({
		data: {
			...base,
			...(account ? { account_id: account.id } : {}),
			vendor_name: v.vendor || undefined,
		},
	});
}

function MoneyFields({
	control,
	setValue,
	subscription,
	accounts,
	account,
	currencies,
	currency,
	baseCurrency,
	startDate,
	foreign,
}: {
	control: FormControl;
	setValue: UseFormSetValue<SubscriptionFormInput>;
	subscription?: Subscription;
	accounts: Account[];
	account: Account | null;
	currencies: string[];
	currency: string;
	baseCurrency: string;
	startDate: string;
	foreign: boolean;
}) {
	/** A new currency starts its rate fresh (the saved one only for the subscription's own). */
	function pickCurrency(typed: string) {
		const code = typed.toUpperCase();
		setValue("currency", code);
		setValue("exchange_rate", subscription?.currency === code ? subscription.exchange_rate : "");
	}

	return (
		<>
			<Grid size={12}>
				<Controller
					name="account_id"
					control={control}
					render={({ field }) => (
						<AccountPicker
							accounts={accounts}
							label="Pay from"
							value={field.value}
							onChange={field.onChange}
							helperText={
								account
									? `Planned payments go in this account, in ${account.currency}`
									: "Optional. The account its planned payments are made in"
							}
						/>
					)}
				/>
			</Grid>

			<Grid size={{ xs: 12, sm: 6 }}>
				<FormTextField
					control={control}
					name="amount"
					label="Cost per cycle"
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
					<Controller
						name="currency"
						control={control}
						render={({ field, fieldState }) => (
							<CurrencyField
								key="currency-free"
								label="Currency"
								currencies={currencies}
								defaultValue={field.value}
								onInputChange={pickCurrency}
								error={fieldState.error?.message}
								required
							/>
						)}
					/>
				)}
			</Grid>

			{foreign && (
				<Grid size={12}>
					<Controller
						name="exchange_rate"
						control={control}
						render={({ field, fieldState }) => (
							<RateField
								key={`rate-${currency}`}
								from={currency}
								to={baseCurrency}
								on={startDate}
								label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
								value={field.value}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>
			)}
		</>
	);
}

/** Status, the number of payments (for instalments) and the reminder. */
function PlanFields({
	control,
	subscription,
}: {
	control: FormControl;
	subscription?: Subscription;
}) {
	return (
		<>
			<Grid size={{ xs: 12, sm: 6 }}>
				<FormTextField control={control} name="status" select label="Status" required>
					{SUBSCRIPTION_STATUSES.filter(
						// "Completed" happens by itself, when the last payment is made
						(s) => s !== "completed" || subscription?.status === "completed",
					).map((s) => (
						<MenuItem key={s} value={s}>
							{SUBSCRIPTION_STATUS_LABELS[s]}
						</MenuItem>
					))}
				</FormTextField>
			</Grid>

			<Grid size={12}>
				<FormSwitch
					control={control}
					name="amount_varies"
					label="The amount changes from month to month"
				/>
				<Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
					The amount above is the usual one. Payments are shown as estimates, and you enter the real
					amount (and exchange rate) when you pay.
				</Typography>
			</Grid>
			<Grid size={{ xs: 12, sm: 6 }}>
				<FormTextField
					control={control}
					name="installments_total"
					label="Number of payments"
					type="number"
					placeholder="Goes on until you stop it"
					helperText="For instalments: it completes after this many payments"
					slotProps={{ inputLabel: { shrink: true } }}
				/>
			</Grid>
			<Grid size={{ xs: 12, sm: 6 }}>
				<FormTextField
					control={control}
					name="remind_days_before"
					select
					label="Remind me"
					helperText="Overdue payments are always told"
				>
					{REMIND_OPTIONS.map((o) => (
						<MenuItem key={o.value} value={o.value}>
							{o.label}
						</MenuItem>
					))}
				</FormTextField>
			</Grid>
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
	const { control, handleSubmit, setValue } = useForm<
		SubscriptionFormInput,
		unknown,
		SubscriptionFormOutput
	>({
		resolver: zodResolver(subscriptionSchema(baseCurrency)),
		defaultValues: subscriptionDefaults(subscription, baseCurrency),
	});
	// The exchange-rate suggestion follows the first billing date.
	const [accountId, currency, startDate] = useWatch({
		control,
		name: ["account_id", "currency", "start_date"],
	});
	const account = accounts.find((a) => a.id === accountId) ?? null;
	// An account brings its own currency and rate, so nothing is typed for them.
	const foreign = !account && currency.length === 3 && currency.toUpperCase() !== baseCurrency;

	async function submit(v: SubscriptionFormOutput) {
		const ok = await run(() => save(subscription, v, account, baseCurrency));
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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<FormTextField
						control={control}
						name="name"
						label="Name"
						placeholder="Netflix"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>

				<MoneyFields
					control={control}
					setValue={setValue}
					subscription={subscription}
					accounts={accounts}
					account={account}
					currencies={currencies}
					currency={currency}
					baseCurrency={baseCurrency}
					startDate={startDate}
					foreign={foreign}
				/>

				<Grid size={{ xs: 5, sm: 4 }}>
					<FormTextField
						control={control}
						name="interval_count"
						label="Every"
						type="number"
						required
					/>
				</Grid>
				<Grid size={{ xs: 7, sm: 8 }}>
					<FormTextField
						control={control}
						name="interval_unit"
						select
						label="Billing period"
						required
					>
						{INTERVAL_UNITS.map((u) => (
							<MenuItem key={u} value={u}>
								{u[0].toUpperCase() + u.slice(1)}(s)
							</MenuItem>
						))}
					</FormTextField>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="start_date"
						label="First billing date"
						type="date"
						helperText="Anchors the schedule, e.g. the 1st of each month"
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>

				<PlanFields control={control} subscription={subscription} />

				<Grid size={{ xs: 12, sm: 6 }}>
					<FormTextField
						control={control}
						name="payment_method"
						select
						label="Payment method"
						required
					>
						{PAYMENT_METHODS.map((m) => (
							<MenuItem key={m} value={m}>
								{PAYMENT_METHOD_LABELS[m]}
							</MenuItem>
						))}
					</FormTextField>
				</Grid>

				<Grid size={{ xs: 12, sm: 6 }}>
					<Controller
						name="category"
						control={control}
						render={({ field, fieldState }) => (
							<CategoryField
								categories={categories}
								defaultValue={field.value}
								onValueChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>

				<Grid size={12}>
					<Controller
						name="vendor"
						control={control}
						render={({ field, fieldState }) => (
							<VendorField
								vendors={vendors}
								defaultValue={field.value}
								onValueChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
