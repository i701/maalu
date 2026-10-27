import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import AccountForm from "#/components/AccountForm";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import MobileCard from "#/components/MobileCard";
import PendingOverlay from "#/components/PendingOverlay";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import StatCard from "#/components/StatCard";
import SearchField from "#/components/SearchField";
import TableCard from "#/components/TableCard";
import TableToolbar from "#/components/TableToolbar";
import { formatMoney, sumDecimals } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { ACCENT } from "#/lib/m3";
import { staggerChildren } from "#/lib/motion";
import { unwrap } from "#/lib/unwrap";
import { deleteAccountFn, getAccountSummaryFn, listAccountsFn } from "#/server/accounts";
import { listCurrenciesFn } from "#/server/currencies";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_GROUPS, type Account, type AccountGroup } from "#/types/api";

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

/** Icon, colour and blob shape for each account type's cards. */
const GROUP_TILE: Record<AccountGroup, { symbol: string; accent: string; shape: number }> = {
	cash: { symbol: "payments", accent: ACCENT.green, shape: 1 },
	accounts: { symbol: "account_balance", accent: ACCENT.blue, shape: 0 },
	card: { symbol: "credit_card", accent: ACCENT.orange, shape: 3 },
	debit_card: { symbol: "credit_card", accent: ACCENT.violet, shape: 2 },
	savings: { symbol: "savings", accent: ACCENT.lime, shape: 5 },
	prepaid: { symbol: "sell", accent: ACCENT.pink, shape: 4 },
	investments: { symbol: "savings", accent: ACCENT.amber, shape: 6 },
	overdrafts: { symbol: "info", accent: ACCENT.pink, shape: 7 },
	loan: { symbol: "receipt_long", accent: ACCENT.orange, shape: 3 },
	insurance: { symbol: "verified", accent: ACCENT.slate, shape: 2 },
	others: { symbol: "category", accent: ACCENT.slate, shape: 0 },
};

const isNegative = (amount: string) => amount.startsWith("-");

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
				symbol="account_balance"
				accent="green"
				shape={1}
				stats={[
					{
						symbol: "account_balance",
						label: `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`,
					},
					{ symbol: "savings", label: `Net ${formatMoney(summary.total, summary.currency)}` },
				]}
				description="Wallets, bank accounts, cards and loans. Balances follow the transactions you link to them."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add account
					</Button>
				}
			/>

			<Grid container spacing={2} sx={{ mb: 3, ...staggerChildren() }}>
				<Grid size={{ xs: 12, sm: 4 }}>
					<StatCard
						label="Assets"
						value={formatMoney(summary.assets, summary.currency)}
						gradient="emerald"
						icon="account_balance"
						shape={0}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<StatCard
						label="Liabilities"
						value={formatMoney(summary.liabilities, summary.currency)}
						gradient="rose"
						icon="credit_card"
						shape={3}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<StatCard
						label="Total"
						value={formatMoney(summary.total, summary.currency)}
						gradient={isNegative(summary.total) ? "rose" : "navy"}
						icon="savings"
						shape={6}
					/>
				</Grid>
			</Grid>

			<PendingOverlay>
				<TableCard flat>
					<TableToolbar
						viewToggle={false}
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
						<EmptyState
							firstRun={!search.q}
							symbol={search.q ? "search" : "account_balance"}
							accent={search.q ? "slate" : "green"}
							shape={1}
						>
							{search.q
								? "No accounts match this search."
								: "No accounts yet. Add your wallet or bank account to start tracking balances."}
						</EmptyState>
					) : (
						<Box sx={{ display: "grid", gap: 3 }}>
							{groups.map(({ group, items }) => (
								<Box key={group}>
									<Stack
										direction="row"
										sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 1, px: 0.5 }}
									>
										<Typography variant="subtitle1">{ACCOUNT_GROUP_LABELS[group]}</Typography>
										<Typography variant="body2" sx={{ color: "text.secondary" }}>
											{formatMoney(
												sumDecimals(items.map((a) => a.base_balance)),
												user.base_currency,
											)}
										</Typography>
									</Stack>
									<Box
										sx={{
											display: "grid",
											gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
											gap: 1,
											...staggerChildren(),
										}}
									>
										{items.map((a) => (
											<Box
												key={a.id}
												sx={{
													bgcolor: "var(--md-sys-color-surface-container-low)",
													borderRadius: "var(--shape-xl)",
													transition:
														"transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)",
													"&:active": { transform: "scale(.97)" },
												}}
											>
												<MobileCard
													leading={
														<ShapeTile
															shape={GROUP_TILE[group].shape}
															size={52}
															accent={GROUP_TILE[group].accent}
														>
															<Symbol name={GROUP_TILE[group].symbol} size={24} filled />
														</ShapeTile>
													}
													primary={
														<Typography variant="body2" sx={{ fontWeight: 500 }}>
															{a.name}
														</Typography>
													}
													secondary={
														a.description && (
															<Typography variant="caption" sx={{ color: "text.secondary" }}>
																{a.description}
															</Typography>
														)
													}
													end={
														<Typography
															variant="body2"
															sx={{
																fontWeight: 600,
																color: isNegative(a.balance) ? "error.main" : "text.primary",
															}}
														>
															{formatMoney(a.balance, a.currency)}
														</Typography>
													}
													endSecondary={
														a.currency !== user.base_currency && (
															<Typography variant="caption" sx={{ color: "text.secondary" }}>
																≈ {formatMoney(a.base_balance, user.base_currency)} @{" "}
																{Number(a.exchange_rate)}
															</Typography>
														)
													}
													actions={
														<>
															<IconButton
																aria-label="Edit"
																title="Edit"
																size="small"
																onClick={() => setEditing(a)}
															>
																<EditOutlinedIcon fontSize="small" />
															</IconButton>
															<IconButton
																aria-label="Delete"
																title="Delete"
																size="small"
																onClick={() => setDeleting(a)}
															>
																<DeleteOutlineIcon fontSize="small" />
															</IconButton>
														</>
													}
												/>
											</Box>
										))}
									</Box>
								</Box>
							))}
						</Box>
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
