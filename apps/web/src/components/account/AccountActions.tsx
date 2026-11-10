import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useState } from "react";
import type { Account } from "#/types/api";
import AccountForm from "../AccountForm";
import AdjustBalanceDialog from "../AdjustBalanceDialog";

/** The buttons at the top of an account's page, with the dialogs they open: change the account,
 * make its balance match the bank, and add a transaction (new ones start in this account). */
export default function AccountActions({
	account,
	accounts,
	currencies,
	baseCurrency,
	onAdd,
}: {
	account: Account;
	accounts: Account[];
	currencies: string[];
	baseCurrency: string;
	onAdd: () => void;
}) {
	const [dialog, setDialog] = useState<"edit" | "adjust" | null>(null);
	const archived = account.archived_at !== null;
	return (
		<Box
			sx={{
				display: "flex",
				gap: { xs: 0.75, md: 1 },
				flexWrap: "wrap",
				// smaller buttons on a phone, so the three fit on one or two short lines
				"& .MuiButton-root": {
					minHeight: { xs: 32, md: undefined },
					px: { xs: 1.5, md: undefined },
					py: { xs: 0.25, md: undefined },
					fontSize: { xs: 13, md: undefined },
				},
			}}
		>
			{!archived && (
				<Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
					Add transaction
				</Button>
			)}
			<Button variant="contained" onClick={() => setDialog("edit")}>
				Edit account
			</Button>
			{!archived && (
				<Button variant="contained" onClick={() => setDialog("adjust")}>
					Adjust balance
				</Button>
			)}
			{dialog === "edit" && (
				<AccountForm
					account={account}
					accounts={accounts}
					currencies={currencies}
					baseCurrency={baseCurrency}
					onClose={() => setDialog(null)}
				/>
			)}
			{dialog === "adjust" && (
				<AdjustBalanceDialog account={account} onClose={() => setDialog(null)} />
			)}
		</Box>
	);
}
