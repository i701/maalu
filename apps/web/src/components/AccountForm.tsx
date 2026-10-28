import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { todayIso } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createAccountFn, updateAccountFn } from "#/server/accounts";
import { ACCOUNT_GROUPS, ACCOUNT_GROUP_LABELS, type Account, type AccountGroup } from "#/types/api";
import CurrencyChips from "./CurrencyChips";
import FormDialog from "./FormDialog";
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
	const foreign = currency !== baseCurrency;
	const locked = (account?.transaction_count ?? 0) > 0;
	const quick = [...new Set([baseCurrency, ...accounts.map((a) => a.currency)])].slice(0, 5);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();

		const fields = {
			group: text("group") as AccountGroup,
			name: text("name"),
			opening_amount: text("opening_amount") || "0",
			currency,
			exchange_rate: foreign ? text("exchange_rate") : undefined,
			description: text("description") || null,
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
						defaultValue={account?.group ?? "cash"}
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
			</Grid>
		</FormDialog>
	);
}
