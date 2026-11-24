import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { Fragment } from "react";
import { type Control, Controller } from "react-hook-form";
import { cardText } from "#/lib/cards";
import {
	type AccountRef,
	type Card,
	type Category,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	type TransactionType,
} from "#/types/api";
import CategoryField from "../CategoryField";
import CurrencyField from "../CurrencyField";
import FormTextField from "../FormTextField";
import RateField from "../RateField";
import AccountPicker, { type AccountChoice } from "./AccountPicker";
import { Cell, RevealCell } from "./Cells";
import type { TxValues } from "./schema";
import SplitEditor from "./SplitEditor";
import type { SplitsState } from "./useSplits";

/** The fields for an income or expense: amount, account, currency and rate, method, category. */
export default function OrdinaryFields({
	control,
	type,
	accounts,
	account,
	onPickAccount,
	cards,
	onPickCard,
	currencies,
	onCurrencyChange,
	effectiveCurrency,
	foreign,
	baseCurrency,
	switched,
	splits,
	categories,
	categoryKey,
	date,
}: {
	control: Control<TxValues>;
	type: TransactionType;
	accounts: AccountChoice[];
	/** The chosen account, which fixes the currency. */
	account: AccountRef | null;
	onPickAccount: (id: string) => void;
	/** Every card; only the ones on the chosen account are offered once one is picked. */
	cards: Card[];
	onPickCard: (id: string) => void;
	currencies: string[];
	onCurrencyChange: (currency: string) => void;
	/** The account's currency when one is picked, otherwise what was typed. */
	effectiveCurrency: string;
	foreign: boolean;
	baseCurrency: string;
	switched: boolean;
	splits: SplitsState;
	categories: Category[];
	/** Changes when a vendor fills the category in, so the picker shows it. */
	categoryKey: number;
	/** The transaction date, which the suggested exchange rate is looked up for */
	date: string;
}) {
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
					<FormTextField
						key="amount-typed"
						control={control}
						name="amount"
						label="Amount"
						placeholder="12.50"
						helperText={type === "income" ? "Money received" : "Money spent"}
						required
						autoFocus
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				)}
			</Cell>

			<Cell size={12} fadeIn={switched}>
				<Controller
					name="account_id"
					control={control}
					render={({ field }) => (
						<AccountPicker
							accounts={accounts}
							label="Account"
							value={field.value}
							onChange={onPickAccount}
							helperText={
								account
									? `Uses the account's currency (${account.currency}) and updates its balance`
									: "Optional. Choose where the money moved"
							}
						/>
					)}
				/>
			</Cell>

			{type === "expense" && cards.length > 0 && (
				<Cell size={12} fadeIn={switched}>
					<Controller
						name="card_id"
						control={control}
						render={({ field }) => (
							<TextField
								select
								label="Card"
								value={field.value}
								onChange={(e) => onPickCard(e.target.value)}
								helperText="Optional. A card spends from its own account"
							>
								<MenuItem value="">None</MenuItem>
								{cards
									.filter((c) => !account || c.account.id === account.id)
									.map((c) => (
										<MenuItem key={c.id} value={c.id}>
											{cardText(c)} · {c.account.name}
										</MenuItem>
									))}
							</TextField>
						)}
					/>
				</Cell>
			)}

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
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
								onInputChange={onCurrencyChange}
								error={fieldState.error?.message}
								required
							/>
						)}
					/>
				)}
			</Cell>

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				{foreign ? (
					<Controller
						name="exchange_rate"
						control={control}
						render={({ field, fieldState }) => (
							<RateField
								key={`rate-${effectiveCurrency}`}
								from={effectiveCurrency}
								to={baseCurrency}
								on={date}
								label={`Rate: 1 ${effectiveCurrency} = ? ${baseCurrency}`}
								value={field.value}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
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
			</Cell>

			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				{/* beside the payment method, split or not, so it never moves; level with the field */}
				<Box sx={{ minHeight: 56, display: "flex", alignItems: "center" }}>
					<FormControlLabel
						control={
							<Switch checked={splits.enabled} onChange={(_, on) => splits.setEnabled(on)} />
						}
						label="Split by item and category"
					/>
				</Box>
			</Cell>

			{/* a split purchase has a category on each item instead */}
			<RevealCell size={12} show={!splits.enabled}>
				<Controller
					name="category"
					control={control}
					render={({ field, fieldState }) => (
						<CategoryField
							key={categoryKey}
							categories={categories}
							defaultValue={field.value}
							onValueChange={field.onChange}
							error={fieldState.error?.message}
						/>
					)}
				/>
			</RevealCell>

			<RevealCell size={12} show={splits.enabled}>
				<SplitEditor splits={splits} currency={effectiveCurrency} categories={categories} />
			</RevealCell>
		</Fragment>
	);
}
