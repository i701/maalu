import Alert from "@mui/material/Alert";
import { Fragment } from "react";
import type { Control } from "react-hook-form";
import type { TransferSide } from "#/lib/transfer";
import type { AccountChoice } from "./AccountPicker";
import { Cell, RevealCell } from "./Cells";
import type { TxValues } from "./schema";
import TransferSlabs from "./TransferSlabs";

/** The fields that differ for a transfer: the two slabs, From and To, each with its account, and
 * the amount that leaves and, between two currencies, the amount that arrives. */
export default function TransferFields({
	control,
	accounts,
	onPick,
	onSwap,
	crossCurrency,
	switched,
}: {
	control: Control<TxValues>;
	accounts: AccountChoice[];
	onPick: (side: TransferSide, id: string) => void;
	onSwap: () => void;
	crossCurrency: boolean;
	switched: boolean;
}) {
	return (
		<Fragment>
			<Cell size={12} fadeIn={switched}>
				<TransferSlabs
					control={control}
					accounts={accounts}
					crossCurrency={crossCurrency}
					onPick={onPick}
					onSwap={onSwap}
				/>
			</Cell>
			<RevealCell size={12} show={accounts.length < 2}>
				<Alert severity="info">
					Add at least two accounts on the Accounts page to make a transfer.
				</Alert>
			</RevealCell>
		</Fragment>
	);
}
