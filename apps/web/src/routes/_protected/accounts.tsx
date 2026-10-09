import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import AccountForm from "#/components/AccountForm";
import ConfirmDelete from "#/components/ConfirmDelete";
import PageHeader from "#/components/PageHeader";
import RefreshButton from "#/components/RefreshButton";
import TableCard from "#/components/TableCard";
import { formatMoney, sumDecimals } from "#/lib/format";
import { unwrap } from "#/lib/unwrap";
import { deleteAccountFn, getAccountSummaryFn, listAccountsFn } from "#/server/accounts";
import { listCurrenciesFn } from "#/server/currencies";
import { ACCOUNT_GROUPS, ACCOUNT_GROUP_LABELS, type Account } from "#/types/api";

export const Route = createFileRoute("/_protected/accounts")({
	loader: async () => {
		const [accounts, summary, currencies] = await Promise.all([
			listAccountsFn(),
			getAccountSummaryFn(),
			listCurrenciesFn(),
		]);
		return { accounts: unwrap(accounts), summary: unwrap(summary), currencies };
	},
	component: AccountsPage,
});

const isNegative = (amount: string) => amount.startsWith("-");

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
	return (
		<Card>
			<CardContent>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{label}
				</Typography>
				<Typography variant="h2" component="p" sx={{ mt: 0.5, color }}>
					{value}
				</Typography>
			</CardContent>
		</Card>
	);
}

function AccountsPage() {
	const { accounts, summary, currencies } = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const [editing, setEditing] = useState<Account | "new" | null>(null);
	const [deleting, setDeleting] = useState<Account | null>(null);

	const groups = ACCOUNT_GROUPS.map((group) => ({
		group,
		items: accounts.filter((a) => a.group === group),
	})).filter((g) => g.items.length > 0);

	return (
		<>
			<PageHeader
				title="Accounts"
				description="Wallets, bank accounts, cards and loans. Balances follow the transactions you link to them."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add account
					</Button>
				}
			/>

			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid size={{ xs: 12, sm: 4 }}>
					<SummaryCard
						label="Assets"
						value={formatMoney(summary.assets, summary.currency)}
						color="success.main"
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<SummaryCard
						label="Liabilities"
						value={formatMoney(summary.liabilities, summary.currency)}
						color="error.main"
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<SummaryCard
						label="Total"
						value={formatMoney(summary.total, summary.currency)}
						color={isNegative(summary.total) ? "error.main" : undefined}
					/>
				</Grid>
			</Grid>

			<TableCard>
				<Stack
					direction="row"
					sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}
				>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{accounts.length} {accounts.length === 1 ? "account" : "accounts"}
					</Typography>
					<RefreshButton />
				</Stack>

				{accounts.length === 0 ? (
					<Typography sx={{ textAlign: "center", py: 8, px: 2, color: "text.secondary" }}>
						No accounts yet. Add your wallet or bank account to start tracking balances.
					</Typography>
				) : (
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Account</TableCell>
									<TableCell align="right">Balance</TableCell>
									<TableCell align="right" sx={{ width: 100 }} />
								</TableRow>
							</TableHead>
							<TableBody>
								{groups.map(({ group, items }) => (
									<Fragment key={group}>
										<TableRow sx={{ bgcolor: "action.hover" }}>
											<TableCell sx={{ fontWeight: 600 }}>{ACCOUNT_GROUP_LABELS[group]}</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
												{formatMoney(
													sumDecimals(items.map((a) => a.base_balance)),
													user.base_currency,
												)}
											</TableCell>
											<TableCell />
										</TableRow>
										{items.map((a) => (
											<TableRow key={a.id} hover>
												<TableCell>
													<Typography variant="body2" sx={{ fontWeight: 500 }}>
														{a.name}
													</Typography>
													{a.description && (
														<Typography variant="caption" sx={{ color: "text.secondary" }}>
															{a.description}
														</Typography>
													)}
												</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													<Typography
														variant="body2"
														sx={{
															fontWeight: 600,
															color: isNegative(a.balance) ? "error.main" : "text.primary",
														}}
													>
														{formatMoney(a.balance, a.currency)}
													</Typography>
													{a.currency !== user.base_currency && (
														<Typography variant="caption" sx={{ color: "text.secondary" }}>
															≈ {formatMoney(a.base_balance, user.base_currency)} @{" "}
															{Number(a.exchange_rate)}
														</Typography>
													)}
												</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													<Tooltip title="Edit">
														<IconButton
															aria-label="Edit"
															size="small"
															onClick={() => setEditing(a)}
														>
															<EditOutlinedIcon fontSize="small" />
														</IconButton>
													</Tooltip>
													<Tooltip title="Delete">
														<IconButton
															aria-label="Delete"
															size="small"
															onClick={() => setDeleting(a)}
														>
															<DeleteOutlineIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										))}
									</Fragment>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</TableCard>

			{editing && (
				<AccountForm
					account={editing === "new" ? undefined : editing}
					accounts={accounts}
					currencies={currencies}
					baseCurrency={user.base_currency}
					onClose={() => setEditing(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete account"
					message={
						deleting.transaction_count > 0
							? `Delete "${deleting.name}"? Its ${deleting.transaction_count} transaction(s) are kept but no longer belong to an account.`
							: `Delete "${deleting.name}"?`
					}
					onConfirm={() => deleteAccountFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
