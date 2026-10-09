import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useAction } from "#/lib/use-action";
import { createSubscriptionFn, updateSubscriptionFn } from "#/server/subscriptions";
import {
	INTERVAL_UNITS,
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	SUBSCRIPTION_STATUSES,
	SUBSCRIPTION_STATUS_LABELS,
	type IntervalUnit,
	type PaymentMethod,
	type Subscription,
	type SubscriptionStatus,
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

export default function SubscriptionForm({
	subscription,
	vendors,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new subscription */
	subscription?: Subscription;
	vendors: Vendor[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
	const [currency, setCurrency] = useState(subscription?.currency ?? baseCurrency);
	const foreign = currency.length === 3 && currency.toUpperCase() !== baseCurrency;

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();

		const base = {
			name: text("name"),
			amount: text("amount"),
			currency: text("currency").toUpperCase(),
			exchange_rate: foreign ? text("exchange_rate") : undefined,
			payment_method: text("payment_method") as PaymentMethod,
			category: text("category"),
			interval_unit: text("interval_unit") as IntervalUnit,
			interval_count: Number(text("interval_count")),
			start_date: text("start_date"),
			status: text("status") as SubscriptionStatus,
		};
		const vendorName = text("vendor");

		const ok = await run(() =>
			subscription
				? updateSubscriptionFn({
						data: {
							id: subscription.id,
							changes: {
								...base,
								// unchanged -> omit; cleared -> unlink; otherwise find-or-create by name
								...(vendorName === (subscription.vendor?.name ?? "")
									? {}
									: vendorName
										? { vendor_name: vendorName }
										: { vendor_id: null }),
							},
						},
					})
				: createSubscriptionFn({
						data: { ...base, vendor_name: vendorName || undefined },
					}),
		);
		if (ok) {
			notify(subscription ? "Subscription updated" : "Subscription added");
			onClose();
		}
	}

	return (
		<FormDialog
			title={subscription ? "Edit subscription" : "Add subscription"}
			error={error}
			pending={pending}
			onSubmit={submit}
			onClose={onClose}
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
					<CurrencyField
						name="currency"
						label="Currency"
						currencies={currencies}
						defaultValue={subscription?.currency ?? baseCurrency}
						onInputChange={(v) => setCurrency(v.toUpperCase())}
						required
					/>
				</Grid>

				{foreign && (
					<Grid size={12}>
						<TextField
							key="rate-input"
							label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
							name="exchange_rate"
							defaultValue={subscription?.currency === currency ? subscription.exchange_rate : ""}
							placeholder="15.42"
							helperText="Enter your own rate"
							required
							slotProps={{ htmlInput: { inputMode: "decimal" } }}
						/>
					</Grid>
				)}

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
						defaultValue={subscription?.start_date ?? today()}
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
					<TextField
						label="Category"
						name="category"
						defaultValue={subscription?.category}
						required
						slotProps={{ htmlInput: { maxLength: 100 } }}
					/>
				</Grid>

				<Grid size={12}>
					<VendorField vendors={vendors} defaultValue={subscription?.vendor?.name ?? ""} />
				</Grid>
			</Grid>
		</FormDialog>
	);
}
