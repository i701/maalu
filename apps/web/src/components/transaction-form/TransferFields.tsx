import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { Fragment } from "react";
import { type Control, Controller, useWatch } from "react-hook-form";
import { useLastDefined } from "#/lib/motion";
import type { AccountRef } from "#/types/api";
import FormTextField from "../FormTextField";
import { accountMenuItems } from "./accountMenuItems";
import { Cell, RevealCell } from "./Cells";
import type { TxValues } from "./schema";

/** The fields that differ for a transfer: from / to accounts, the amount and what arrived. */
export default function TransferFields({
	control,
	accounts,
	onPickAccount,
	crossCurrency,
	switched,
}: {
	control: Control<TxValues>;
	accounts: AccountRef[];
	onPickAccount: (id: string) => void;
	crossCurrency: boolean;
	switched: boolean;
}) {
	const [accountId, toAccountId] = useWatch({ control, name: ["account_id", "to_account_id"] });
	const account = accounts.find((a) => a.id === accountId) ?? null;
	const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
	const shownTo = useLastDefined(toAccount); // keeps its currency while the field closes

	return (
		<Fragment>
			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				<Controller
					name="account_id"
					control={control}
					render={({ field, fieldState }) => (
						<TextField
							select
							label="From"
							value={field.value}
							onChange={(e) => onPickAccount(e.target.value)}
							error={Boolean(fieldState.error)}
							helperText={fieldState.error?.message}
							required
						>
							{accountMenuItems(accounts, toAccountId)}
						</TextField>
					)}
				/>
			</Cell>
			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				<FormTextField control={control} name="to_account_id" select label="To" required>
					{accountMenuItems(accounts, accountId)}
				</FormTextField>
			</Cell>
			<RevealCell size={12} show={accounts.length < 2}>
				<Alert severity="info">
					Add at least two accounts on the Accounts page to make a transfer.
				</Alert>
			</RevealCell>
			<Cell size={{ xs: 12, sm: crossCurrency ? 6 : 12 }} fadeIn={switched}>
				<FormTextField
					control={control}
					name="amount"
					label={account ? `Amount (${account.currency})` : "Amount"}
					placeholder="100.00"
					helperText="Taken out of the From account"
					required
					autoFocus
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</Cell>
			<RevealCell size={{ xs: 12, sm: 6 }} show={crossCurrency && Boolean(toAccount)}>
				<FormTextField
					control={control}
					name="to_amount"
					label={`Amount received (${shownTo?.currency ?? ""})`}
					placeholder="10.00"
					helperText="Different currencies: enter what arrived"
					required
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</RevealCell>
		</Fragment>
	);
}
