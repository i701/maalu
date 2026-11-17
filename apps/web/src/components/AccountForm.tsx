import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
	bankChoices,
	GROUP_HELP,
	hasCreditLimit,
	isOwedGroup,
	spendableValue,
	statementDays,
} from "#/lib/accounts";
import { todayIso } from "#/lib/format";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createAccountFn, updateAccountFn } from "#/server/accounts";
import { exchangeRate } from "#/server/transactions";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_GROUPS, type Account } from "#/types/api";
import CurrencyChips from "./CurrencyChips";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import NamePickerField from "./NamePickerField";
import { useNotify } from "./Notify";
import RateField from "./RateField";
import SpendableField from "./SpendableField";

const blank = (max: number) => z.string().trim().max(max);

/** The account form. A foreign account needs its rate; a credit card's two days go together. */
const accountSchema = (baseCurrency: string) =>
	z
		.object({
			group: z.enum(ACCOUNT_GROUPS),
			name: z.string().trim().min(1, "Give the account a name").max(200),
			bank: blank(100),
			account_number: blank(80),
			opening_amount: z
				.string()
				.trim()
				.regex(/^(-?\d+(\.\d{1,4})?)?$/, "Enter an amount, like 1250.50 or -300"),
			currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency"),
			exchange_rate: z.string().trim(),
			auto_rate: z.boolean(),
			credit_limit: z
				.string()
				.trim()
				.regex(/^(\d+(\.\d{1,4})?)?$/, "Enter a limit, like 10000"),
			statement_day: z.string(),
			due_day: z.string(),
			description: blank(1000),
			spendable: z.boolean().nullable(),
			exclude_from_stats: z.boolean(),
		})
		.superRefine((v, ctx) => {
			if (v.currency !== baseCurrency && !exchangeRate.safeParse(v.exchange_rate).success)
				ctx.addIssue({ code: "custom", path: ["exchange_rate"], message: "Enter the rate" });
			if (v.group !== "card") return;
			const days = statementDays(v.statement_day, v.due_day);
			if (!days.ok) ctx.addIssue({ code: "custom", path: ["due_day"], message: days.error });
		});

type Schema = ReturnType<typeof accountSchema>;

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
	const { control, handleSubmit, setValue } = useForm<z.input<Schema>, unknown, z.output<Schema>>({
		resolver: zodResolver(accountSchema(baseCurrency)),
		defaultValues: {
			group: account?.group ?? "cash",
			name: account?.name ?? "",
			bank: account?.bank ?? "",
			account_number: account?.account_number ?? "",
			opening_amount: account?.opening_amount ?? "",
			currency: account?.currency ?? baseCurrency,
			exchange_rate: account?.exchange_rate ?? "",
			auto_rate: account?.auto_rate ?? false,
			credit_limit: account?.credit_limit ?? "",
			statement_day: account?.statement_day?.toString() ?? "",
			due_day: account?.due_day?.toString() ?? "",
			description: account?.description ?? "",
			spendable: account?.spendable ?? null,
			exclude_from_stats: account?.exclude_from_stats ?? false,
		},
	});
	const [group, currency] = useWatch({ control, name: ["group", "currency"] });
	const foreign = currency !== baseCurrency;
	const locked = (account?.transaction_count ?? 0) > 0;
	const quick = [...new Set([baseCurrency, ...accounts.map((a) => a.currency)])].slice(0, 5);

	/** A new currency starts its rate fresh (the saved one only for the account's own currency). */
	function pickCurrency(code: string) {
		setValue("currency", code);
		setValue("exchange_rate", account?.currency === code ? account.exchange_rate : "");
	}

	async function submit(v: z.output<Schema>) {
		const days = v.group === "card" ? statementDays(v.statement_day, v.due_day) : null;
		const fields = {
			group: v.group,
			name: v.name,
			opening_amount: v.opening_amount || "0",
			currency: v.currency,
			exchange_rate: foreign ? v.exchange_rate : undefined,
			description: v.description || null,
			// only cards and overdrafts have one; empty means none
			credit_limit: hasCreditLimit(v.group) ? v.credit_limit || null : null,
			// credit cards only; both or neither
			statement_day: days?.ok ? days.statement_day : null,
			due_day: days?.ok ? days.due_day : null,
			exclude_from_stats: v.exclude_from_stats,
			spendable: spendableValue(v.spendable, v.group),
			// only a foreign-currency account has a rate to keep up to date
			auto_rate: foreign && v.auto_rate,
			bank: v.bank || null,
			account_number: v.account_number || null,
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
						<Controller
							name="exchange_rate"
							control={control}
							render={({ field, fieldState }) => (
								<RateField
									key={`rate-${currency}`}
									from={currency}
									to={baseCurrency}
									on={todayIso()}
									label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
									value={field.value}
									onChange={field.onChange}
									error={fieldState.error?.message}
									hint="Used to value this account in your base currency."
								/>
							)}
						/>
						<FormControlLabel
							control={
								<Controller
									name="auto_rate"
									control={control}
									render={({ field }) => (
										<Switch checked={field.value} onChange={(_, on) => field.onChange(on)} />
									)}
								/>
							}
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
						<FormTextField
							control={control}
							name="credit_limit"
							label="Credit limit"
							placeholder="10000"
							helperText={`The most you can owe on it, in ${currency}. It changes no balance: it only shows how much is used.`}
							slotProps={{ htmlInput: { inputMode: "decimal" } }}
						/>
					</Grid>
				)}

				{group === "card" && (
					<>
						<Grid size={{ xs: 12, sm: 6 }}>
							<FormTextField
								control={control}
								name="statement_day"
								label="Statement closes on day"
								placeholder="5"
								slotProps={{
									htmlInput: { inputMode: "numeric", maxLength: 2 },
								}}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<FormTextField
								control={control}
								name="due_day"
								label="Payment due on day"
								placeholder="25"
								slotProps={{
									htmlInput: { inputMode: "numeric", maxLength: 2 },
								}}
							/>
						</Grid>
						<Grid size={12}>
							<Typography
								variant="caption"
								sx={{ color: "text.secondary", mt: -1, display: "block" }}
							>
								Optional. Day of the month, 1 to 31 (a short month uses its last day). With both
								set, Maalu shows what is owed on the last statement, when to pay it, and tells you
								before it is due.
							</Typography>
						</Grid>
					</>
				)}

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
					<FormControlLabel
						control={
							<Controller
								name="exclude_from_stats"
								control={control}
								render={({ field }) => (
									<Switch checked={field.value} onChange={(_, on) => field.onChange(on)} />
								)}
							/>
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
