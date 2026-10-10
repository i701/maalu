import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
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
import { z } from "zod";
import AccountForm from "#/components/AccountForm";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import SearchField from "#/components/SearchField";
import TableCard from "#/components/TableCard";
import TableToolbar from "#/components/TableToolbar";
import { formatMoney, sumDecimals } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { unwrap } from "#/lib/unwrap";
import { deleteAccountFn, getAccountSummaryFn, listAccountsFn } from "#/server/accounts";
import { listCurrenciesFn } from "#/server/currencies";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_GROUPS, type Account } from "#/types/api";

const searchSchema = z.object({
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/accounts")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [accounts, summary, currencies] = await Promise.all([
			listAccountsFn({ data: { q: deps.q } }),
			getAccountSummaryFn(),
			listCurrenciesFn(),
		]);
		const found = unwrap(accounts);
		// The form offers the currencies of *all* your accounts, so a search must not narrow them.
		const everyAccount = deps.q ? unwrap(await listAccountsFn()) : found;
		return {
			accounts: found,
			everyAccount,
			summary: unwrap(summary),
			currencies,
		};
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
	const { accounts, everyAccount, summary, currencies } = Route.useLoaderData();
	// The URL as soon as it changes (the loader data lags behind it), so the box feels instant.
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
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

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
						filters={
							<SearchField
								value={search.q ?? ""}
								placeholder="Search name or description"
								onChange={(q) => navigate({ search: { q: q || undefined } })}
							/>
						}
					/>

					{accounts.length === 0 ? (
						<EmptyState firstRun={!search.q}>
							{search.q
								? "No accounts match this search."
								: "No accounts yet. Add your wallet or bank account to start tracking balances."}
						</EmptyState>
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
												<TableCell sx={{ fontWeight: 600 }}>
													{ACCOUNT_GROUP_LABELS[group]}
												</TableCell>
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
			</PendingOverlay>

			{editing && (
				<AccountForm
					account={editing === "new" ? undefined : editing}
					accounts={everyAccount}
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
