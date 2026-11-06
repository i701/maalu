import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import {
	bankChoices,
	GROUP_HELP,
	hasCreditLimit,
	isOwedGroup,
	spendableValue,
} from "#/lib/accounts";
import SpendableField from "./SpendableField";
import { todayIso } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createAccountFn, updateAccountFn } from "#/server/accounts";
import { ACCOUNT_GROUPS, ACCOUNT_GROUP_LABELS, type Account, type AccountGroup } from "#/types/api";
import CurrencyChips from "./CurrencyChips";
import FormDialog from "./FormDialog";
import NamePickerField from "./NamePickerField";
import RateField from "./RateField";
import { useNotify } from "./Notify";

export default function AccountForm({
	account,
	accounts,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new account */
	account?: Account;
	/** All accounts, to offer the currencies you already use as quick chips. */
	accounts: Account[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [currency, setCurrency] = useState(account?.currency ?? baseCurrency);
	const [group, setGroup] = useState<AccountGroup>(account?.group ?? "cash");
	const [spend, setSpend] = useState<boolean | null>(account?.spendable ?? null);
	const foreign = currency !== baseCurrency;
	const locked = (account?.transaction_count ?? 0) > 0;
	const quick = [...new Set([baseCurrency, ...accounts.map((a) => a.currency)])].slice(0, 5);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();

		const fields = {
			group,
			name: text("name"),
			opening_amount: text("opening_amount") || "0",
			currency,
			exchange_rate: foreign ? text("exchange_rate") : undefined,
			description: text("description") || null,
			// only cards and overdrafts have one; empty means none
			credit_limit: hasCreditLimit(group) ? text("credit_limit") || null : null,
			exclude_from_stats: f.get("exclude_from_stats") === "on",
			spendable: spendableValue(spend, group),
			// only a foreign-currency account has a rate to keep up to date
			auto_rate: foreign && f.get("auto_rate") === "on",
			bank: text("bank") || null,
			account_number: text("account_number") || null,
		};

		const ok = await run(() =>
			account
				? updateAccountFn({ data: { id: account.id, changes: fields } })
				: createAccountFn({ data: fields }),
		);
		if (ok) {
			notify(account ? "Account updated" : "Account added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={account ? "Edit account" : "Add account"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, sm: 5 }}>
					<TextField
						select
						label="Group"
						name="group"
						value={group}
						onChange={(e) => setGroup(e.target.value as AccountGroup)}
						required
					>
						{ACCOUNT_GROUPS.map((g) => (
							<MenuItem key={g} value={g}>
								{ACCOUNT_GROUP_LABELS[g]}
							</MenuItem>
						))}
					</TextField>
				</Grid>
				<Grid size={{ xs: 12, sm: 7 }}>
					<TextField
						label="Name"
						name="name"
						defaultValue={account?.name}
						placeholder="Wallet, BML Savings…"
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Grid>
				<Grid size={12}>
					<Typography variant="body2" sx={{ color: "text.secondary", mt: -0.5 }}>
						{GROUP_HELP[group]}
					</Typography>
				</Grid>

				<Grid size={{ xs: 12, sm: 5 }}>
					<NamePickerField
						names={bankChoices(accounts)}
						noun="bank"
						label="Bank"
						name="bank"
						defaultValue={account?.bank ?? ""}
						maxLength={100}
						helper={false}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 7 }}>
					<TextField
						label="Account number"
						name="account_number"
						defaultValue={account?.account_number ?? ""}
						helperText="Optional. Tells accounts with the same name apart."
						slotProps={{ htmlInput: { maxLength: 80, inputMode: "text", autoComplete: "off" } }}
					/>
				</Grid>

				<Grid size={12}>
					<TextField
						label="Amount"
						name="opening_amount"
						defaultValue={account?.opening_amount ?? ""}
						placeholder="0.00"
						helperText="Starting balance. Use a negative amount for money you owe (cards, loans)."
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>

				<Grid size={12}>
					<CurrencyChips
						value={currency}
						onChange={setCurrency}
						quick={quick}
						currencies={currencies}
						disabled={locked}
						helperText={
							locked
								? "Locked: transactions in this account use this currency."
								: "Transactions in this account use this currency."
						}
					/>
				</Grid>

				{foreign && (
					<Grid size={12}>
						<RateField
							key={`rate-${currency}`}
							from={currency}
							to={baseCurrency}
							on={todayIso()}
							label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
							initial={account?.currency === currency ? account.exchange_rate : ""}
							hint="Used to value this account in your base currency."
						/>
						<FormControlLabel
							control={<Switch name="auto_rate" defaultChecked={account?.auto_rate} />}
							label="Keep this rate up to date"
							sx={{ mt: 0.5 }}
						/>
						<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: -0.5 }}>
							Maalu sets the rate from the market now and again every day, so a rate you type is
							replaced. Leave it off to keep your own, such as your bank's.
						</Typography>
					</Grid>
				)}

				{hasCreditLimit(group) && (
					<Grid size={12}>
						<TextField
							label="Credit limit"
							name="credit_limit"
							defaultValue={account?.credit_limit ?? ""}
							placeholder="10000"
							helperText={`The most you can owe on it, in ${currency}. It changes no balance: it only shows how much is used.`}
							slotProps={{ htmlInput: { inputMode: "decimal" } }}
						/>
					</Grid>
				)}

				<Grid size={12}>
					<TextField
						label="Description"
						name="description"
						defaultValue={account?.description ?? ""}
						multiline
						minRows={2}
						slotProps={{ htmlInput: { maxLength: 1000 } }}
					/>
				</Grid>

				{!isOwedGroup(group) && (
					<Grid size={12}>
						<SpendableField group={group} value={spend} onChange={setSpend} />
					</Grid>
				)}

				<Grid size={12}>
					<FormControlLabel
						control={
							<Switch name="exclude_from_stats" defaultChecked={account?.exclude_from_stats} />
						}
						label="Leave out of my totals"
					/>
					<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: -0.5 }}>
						For an account that is not really yours, like a card you manage for someone else. Its
						balance and transactions stay, but it is not counted in totals, reports, budgets or net
						worth.
					</Typography>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
