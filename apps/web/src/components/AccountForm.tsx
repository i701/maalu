import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { Controller, useForm, useWatch } from "react-hook-form";
import { bankChoices, GROUP_HELP, isOwedGroup } from "#/lib/accounts";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createAccountFn, updateAccountFn } from "#/server/accounts";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_GROUPS, type Account } from "#/types/api";
import CurrencyChips from "./CurrencyChips";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import NamePickerField from "./NamePickerField";
import { useNotify } from "./Notify";
import SpendableField from "./SpendableField";
import CardFields from "./account-form/CardFields";
import ForeignRateFields from "./account-form/ForeignRateFields";
import {
	accountDefaults,
	type AccountFormInput,
	type AccountFormOutput,
	accountRequest,
	accountSchema,
} from "./account-form/schema";
import FormSwitch from "./FormSwitch";
import SwitchHint from "./SwitchHint";

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
	const { control, handleSubmit, setValue } = useForm<AccountFormInput, unknown, AccountFormOutput>(
		{
			resolver: zodResolver(accountSchema(baseCurrency)),
			defaultValues: accountDefaults(account, baseCurrency),
		},
	);
	const [group, currency] = useWatch({ control, name: ["group", "currency"] });
	const foreign = currency !== baseCurrency;
	const locked = (account?.transaction_count ?? 0) > 0;
	const quick = [...new Set([baseCurrency, ...accounts.map((a) => a.currency)])].slice(0, 5);

	/** A new currency starts its rate fresh (the saved one only for the account's own currency). */
	function pickCurrency(code: string) {
		setValue("currency", code);
		setValue("exchange_rate", account?.currency === code ? account.exchange_rate : "");
	}

	async function submit(v: AccountFormOutput) {
		const fields = accountRequest(v, baseCurrency);

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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
		>
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, sm: 5 }}>
					<FormTextField control={control} name="group" select label="Group" required>
						{ACCOUNT_GROUPS.map((g) => (
							<MenuItem key={g} value={g}>
								{ACCOUNT_GROUP_LABELS[g]}
							</MenuItem>
						))}
					</FormTextField>
				</Grid>
				<Grid size={{ xs: 12, sm: 7 }}>
					<FormTextField
						control={control}
						name="name"
						label="Name"
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
					<Controller
						name="bank"
						control={control}
						render={({ field, fieldState }) => (
							<NamePickerField
								names={bankChoices(accounts)}
								noun="bank"
								label="Bank"
								defaultValue={field.value}
								onValueChange={field.onChange}
								error={fieldState.error?.message}
								maxLength={100}
								helper={false}
							/>
						)}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 7 }}>
					<FormTextField
						control={control}
						name="account_number"
						label="Account number"
						helperText="Optional. Tells accounts with the same name apart."
						slotProps={{
							htmlInput: {
								maxLength: 80,
								inputMode: "text",
								autoComplete: "off",
							},
						}}
					/>
				</Grid>

				<Grid size={12}>
					<FormTextField
						control={control}
						name="opening_amount"
						label="Amount"
						placeholder="0.00"
						helperText="Starting balance. Use a negative amount for money you owe (cards, loans)."
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>

				<Grid size={12}>
					<CurrencyChips
						value={currency}
						onChange={pickCurrency}
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
						<ForeignRateFields control={control} currency={currency} baseCurrency={baseCurrency} />
					</Grid>
				)}

				<CardFields control={control} group={group} currency={currency} />

				<Grid size={12}>
					<FormTextField
						control={control}
						name="description"
						label="Description"
						multiline
						minRows={2}
						slotProps={{ htmlInput: { maxLength: 1000 } }}
					/>
				</Grid>

				{!isOwedGroup(group) && (
					<Grid size={12}>
						<Controller
							name="spendable"
							control={control}
							render={({ field }) => (
								<SpendableField group={group} value={field.value} onChange={field.onChange} />
							)}
						/>
					</Grid>
				)}

				<Grid size={12}>
					<FormSwitch control={control} name="exclude_from_stats" label="Leave out of my totals" />
					<SwitchHint>
						For an account that is not really yours, like a card you manage for someone else. Its
						balance and transactions stay, but it is not counted in totals, reports, budgets or net
						worth.
					</SwitchHint>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
