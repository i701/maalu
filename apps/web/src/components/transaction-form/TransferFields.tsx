import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { Fragment } from "react";
import { useLastDefined } from "#/lib/motion";
import type { AccountRef, Transaction } from "#/types/api";
import { Cell, RevealCell } from "./Cells";
import { accountMenuItems } from "./accountMenuItems";

/** The fields that differ for a transfer: from / to accounts, the amount and what arrived. */
export default function TransferFields({
	accounts,
	accountId,
	toAccountId,
	onPickAccount,
	onPickToAccount,
	crossCurrency,
	transaction,
	switched,
}: {
	accounts: AccountRef[];
	accountId: string;
	toAccountId: string;
	onPickAccount: (id: string) => void;
	onPickToAccount: (id: string) => void;
	crossCurrency: boolean;
	transaction?: Transaction;
	switched: boolean;
}) {
	const account = accounts.find((a) => a.id === accountId) ?? null;
	const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
	const shownTo = useLastDefined(toAccount); // keeps its currency while the field closes

	return (
		<Fragment>
			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				<TextField
					select
					label="From"
					value={accountId}
					onChange={(e) => onPickAccount(e.target.value)}
					required
				>
					{accountMenuItems(accounts, toAccountId)}
				</TextField>
			</Cell>
			<Cell size={{ xs: 12, sm: 6 }} fadeIn={switched}>
				<TextField
					select
					label="To"
					value={toAccountId}
					onChange={(e) => onPickToAccount(e.target.value)}
					required
				>
					{accountMenuItems(accounts, accountId)}
				</TextField>
			</Cell>
			<RevealCell size={12} show={accounts.length < 2}>
				<Alert severity="info">
					Add at least two accounts on the Accounts page to make a transfer.
				</Alert>
			</RevealCell>
			<Cell size={{ xs: 12, sm: crossCurrency ? 6 : 12 }} fadeIn={switched}>
				<TextField
					label={account ? `Amount (${account.currency})` : "Amount"}
					name="amount"
					defaultValue={transaction?.amount}
					placeholder="100.00"
					helperText="Taken out of the From account"
					required
					autoFocus
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</Cell>
			<RevealCell size={{ xs: 12, sm: 6 }} show={crossCurrency && Boolean(toAccount)}>
				<TextField
					label={`Amount received (${shownTo?.currency ?? ""})`}
					name="to_amount"
					defaultValue={transaction?.to_amount ?? ""}
					placeholder="10.00"
					helperText="Different currencies: enter what arrived"
					required
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</RevealCell>
		</Fragment>
	);
}
