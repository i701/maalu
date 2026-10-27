import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { Fragment } from "react";
import {
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	type Account,
	type Category,
	type PaymentMethod,
	type Transaction,
	type TransactionType,
} from "#/types/api";
import CategoryField from "../CategoryField";
import CurrencyField from "../CurrencyField";
import { Cell, RevealCell } from "./Cells";
import SplitEditor from "./SplitEditor";
import type { SplitsState } from "./useSplits";
import { accountMenuItems } from "./accountMenuItems";

/** The fields for an income or expense: amount, account, currency and rate, method, category. */
export default function OrdinaryFields({
	type,
	accounts,
	accountId,
	onPickAccount,
	currencies,
	currency,
	onCurrencyChange,
	effectiveCurrency,
	foreign,
	baseCurrency,
	paymentMethod,
	onPaymentMethodChange,
	transaction,
	switched,
	splits,
	categories,
}: {
	type: TransactionType;
	accounts: Account[];
	accountId: string;
	onPickAccount: (id: string) => void;
	currencies: string[];
	currency: string;
	onCurrencyChange: (currency: string) => void;
	/** The account's currency when one is picked, otherwise what was typed. */
	effectiveCurrency: string;
	foreign: boolean;
	baseCurrency: string;
	paymentMethod: PaymentMethod;
	onPaymentMethodChange: (method: PaymentMethod) => void;
	transaction?: Transaction;
	switched: boolean;
	splits: SplitsState;
	categories: Category[];
}) {
	const account = accounts.find((a) => a.id === accountId) ?? null;

	return (
		<Fragment>
			<Cell size={12} fadeIn={switched}>
				{splits.enabled ? (
					<TextField
						key="amount-total"
						label="Amount"
						value={splits.total}
						helperText="The total of the items below"
						disabled
					/>
				) : (
					<TextField
						key="amount-typed"
						label="Amount"
						name="amount"
						defaultValue={transaction?.amount}
						placeholder="12.50"
						helperText={type === "income" ? "Money received" : "Money spent"}
						required
						autoFocus
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				)}
			</Cell>

			<Cell size={12} fadeIn={switched}>
				<TextField
					select
					label="Account"
					value={accountId}
					onChange={(e) => onPickAccount(e.target.value)}
					helperText={
						account
							? `Uses the account's currency (${account.currency}) and updates its balance`
							: "Optional. Choose where the money moved"
					}
				>
					<MenuItem value="">None</MenuItem>
					{accountMenuItems(accounts)}
				</TextField>
			</Cell>

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
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
			</Cell>

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
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
			</Cell>

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				<TextField
					select
					label="Payment method"
					name="payment_method"
					value={paymentMethod}
					onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
					required
				>
					{PAYMENT_METHODS.map((m) => (
						<MenuItem key={m} value={m}>
							{PAYMENT_METHOD_LABELS[m]}
						</MenuItem>
					))}
				</TextField>
			</Cell>

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				{splits.enabled ? (
					<FormControlLabel
						control={<Switch checked onChange={() => splits.setEnabled(false)} />}
						label="Split by item and category"
					/>
				) : (
					<CategoryField
						categories={categories}
						name="category"
						defaultValue={
							transaction && transaction.type !== "transfer" ? transaction.category : ""
						}
					/>
				)}
			</Cell>

			{!splits.enabled && (
				<Cell size={12} fadeIn={switched}>
					<FormControlLabel
						control={<Switch checked={false} onChange={() => splits.setEnabled(true)} />}
						label="Split by item and category"
					/>
				</Cell>
			)}

			<RevealCell size={12} show={splits.enabled}>
				<SplitEditor splits={splits} currency={effectiveCurrency} categories={categories} />
			</RevealCell>
		</Fragment>
	);
}
