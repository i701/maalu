import { accountTints, bankSubsections, banksInUse } from "#/lib/accounts";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import AccountCard from "#/components/AccountCard";
import AccountForm from "#/components/AccountForm";
import ArchivedAccounts from "#/components/ArchivedAccounts";
import Figure from "#/components/Figure";
import ChipFilter from "#/components/ChipFilter";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import StatCard from "#/components/StatCard";
import SearchField from "#/components/SearchField";
import TableCard from "#/components/TableCard";
import TableToolbar from "#/components/TableToolbar";
import { formatMoney, formatMoneyCompact, sumDecimals, formatMoneyFull } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { staggerChildren } from "#/lib/motion";
import { unwrap } from "#/lib/unwrap";
import {
	deleteAccountFn,
	getAccountSummaryFn,
	listAccountsFn,
	listAccountTrendsFn,
	listCardStatementsFn,
} from "#/server/accounts";
import { listCurrenciesFn } from "#/server/currencies";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_GROUPS, type Account } from "#/types/api";

const searchSchema = z.object({
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	bank: z.coerce.string().max(100).optional().catch(undefined),
	group: z.enum(["type", "bank"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/accounts/")({
	validateSearch: searchSchema,
	// `group` is a rendering choice made in the browser, so it does not refetch the list.
	loaderDeps: ({ search }) => ({ q: search.q, bank: search.bank }),
	loader: async ({ deps }) => {
		const [accounts, summary, currencies, archived, statements, trends] = await Promise.all([
			listAccountsFn({ data: { q: deps.q, bank: deps.bank } }),
			getAccountSummaryFn(),
			listCurrenciesFn(),
			listAccountsFn({ data: { archived: true } }),
			listCardStatementsFn(),
			listAccountTrendsFn(), // the small balance lines on each row
		]);
		const found = unwrap(accounts);
		// The form offers the currencies of *all* your accounts, so a search or filter must not
		// narrow them.
		const everyAccount = deps.q || deps.bank ? unwrap(await listAccountsFn()) : found;
		return {
			accounts: found,
			archived: unwrap(archived),
			everyAccount,
			summary: unwrap(summary),
			statements: statements.ok ? statements.data : [],
			trends,
			currencies,
		};
	},
	component: AccountsPage,
});

const isNegative = (amount: string) => amount.startsWith("-");

/** The account cards grouped by their type (the default), or under the bank that holds them. */
function GroupByToggle({
	value,
	onChange,
}: {
	value: "type" | "bank";
	onChange: (value: "type" | "bank") => void;
}) {
	return (
		<ToggleButtonGroup
			exclusive
			size="small"
			value={value}
			onChange={(_, next: "type" | "bank" | null) => next && onChange(next)}
			aria-label="Group accounts by"
			sx={{ "& .MuiToggleButtonGroup-grouped": { height: 36, px: 1.5 } }}
		>
			<ToggleButton value="type" aria-label="Group by type">
				By type
			</ToggleButton>
			<ToggleButton value="bank" aria-label="Group by bank">
				By bank
			</ToggleButton>
		</ToggleButtonGroup>
	);
}

function AccountsPage() {
	const { accounts, archived, everyAccount, summary, currencies, statements, trends } =
		Route.useLoaderData();
	// The URL as soon as it changes (the loader data lags behind it), so the box feels instant.
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const { user } = Route.useRouteContext();
	const [editing, setEditing] = useState<Account | "new" | null>(null);
	const [deleting, setDeleting] = useState<Account | null>(null);

	// every account (not only the ones a search left) so a colour never changes with the search
	const tints = accountTints(everyAccount.map((a) => a.id));
	const trendOf = new Map(trends.map((t) => [t.account_id, t]));

	// the filter chips offer every bank in use, even while one is picked, so they never vanish
	const banks = banksInUse(everyAccount);
	const byBank = (search.group ?? "type") === "bank";
	const sections = byBank
		? [
				...banks.map((bank) => ({
					heading: bank,
					items: accounts.filter((a) => a.bank === bank),
					subsections: null,
				})),
				{
					heading: "No bank",
					items: accounts.filter((a) => !a.bank),
					subsections: null,
				},
			]
		: ACCOUNT_GROUPS.map((group) => {
				const items = accounts.filter((a) => a.group === group);
				// The Bank accounts section lists each bank's accounts under the bank's name.
				const subsections = group === "accounts" ? bankSubsections(items) : null;
				return { heading: ACCOUNT_GROUP_LABELS[group], items, subsections };
			});
	const shown = sections.filter((s) => s.items.length > 0);

	return (
		<>
			<PageHeader
				title="Accounts"
				symbol="account_balance"
				accent="green"
				shape={1}
				dock={[
					{
						label: "Assets",
						value: formatMoneyCompact(summary.assets, summary.currency),
						full: formatMoneyFull(summary.assets, summary.currency),
					},
					{
						label: "Liabilities",
						value: formatMoneyCompact(summary.liabilities, summary.currency),
						full: formatMoneyFull(summary.liabilities, summary.currency),
					},
					{
						label: "Total",
						value: formatMoneyCompact(summary.total, summary.currency),
						full: formatMoneyFull(summary.total, summary.currency),
						tone: isNegative(summary.total) ? "negative" : undefined,
					},
				]}
				stats={[
					{
						symbol: "account_balance",
						label: `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`,
					},
					{
						symbol: "savings",
						label: `Net ${formatMoneyCompact(summary.total, summary.currency)}`,
					},
				]}
				description="Wallets, bank accounts, cards and loans. Balances follow the transactions you link to them."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add account
					</Button>
				}
			/>

			{/* On a phone these three live in the banner's dock (above); the tiles are for wider screens. */}
			<Grid
				container
				spacing={2}
				sx={{ mb: 3, display: { xs: "none", sm: "flex" }, ...staggerChildren() }}
			>
				<Grid size={{ xs: 12, sm: 4 }}>
					<StatCard
						label="Assets"
						value={formatMoney(summary.assets, summary.currency)}
						tint="emerald"
						icon="account_balance"
						shape={0}
						reverse
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<StatCard
						label="Liabilities"
						value={formatMoney(summary.liabilities, summary.currency)}
						tint="rose"
						icon="credit_card"
						shape={3}
						reverse
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<StatCard
						label="Total"
						value={formatMoney(summary.total, summary.currency)}
						tint={isNegative(summary.total) ? "rose" : "navy"}
						icon="savings"
						shape={6}
						reverse
					/>
				</Grid>
			</Grid>

			<PendingOverlay>
				{/* always a white card, whatever the Cards / Table setting, with the groups inside it */}
				<TableCard flat={false}>
					<TableToolbar
						viewToggle={false}
						summary={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
						actions={
							<GroupByToggle
								value={search.group ?? "type"}
								onChange={(group) => navigate({ search: (p) => ({ ...p, group }) })}
							/>
						}
						chips={
							banks.length > 0 ? (
								<ChipFilter
									allLabel="All banks"
									value={search.bank}
									options={banks.map((b) => ({ value: b, label: b }))}
									onChange={(bank) => navigate({ search: (p) => ({ ...p, bank }) })}
								/>
							) : undefined
						}
						filters={
							<SearchField
								value={search.q ?? ""}
								placeholder="Search name, bank, number…"
								onChange={(q) => navigate({ search: { q: q || undefined } })}
							/>
						}
					/>

					{accounts.length === 0 ? (
						<EmptyState
							firstRun={!search.q && !search.bank}
							symbol={search.q || search.bank ? "search" : "account_balance"}
							accent={search.q || search.bank ? "slate" : "green"}
							shape={1}
						>
							{search.q || search.bank
								? "No accounts match."
								: "No accounts yet. Add your wallet or bank account to start tracking balances."}
						</EmptyState>
					) : (
						<Box sx={{ display: "grid", gap: 3, px: 2, pb: 2 }}>
							{shown.map(({ heading, items, subsections }) => (
								<Box key={heading}>
									<Stack
										direction="row"
										sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 1 }}
									>
										<Typography variant="subtitle1" component="h2" sx={{ fontSize: { md: 18 } }}>
											{heading}
										</Typography>
										<Typography
											component="p"
											sx={{ fontSize: { xs: 20, md: 24 }, lineHeight: 1.2 }}
										>
											<Figure>
												{formatMoney(
													sumDecimals(
														items.filter((a) => !a.exclude_from_stats).map((a) => a.base_balance),
													),
													user.base_currency,
												)}
											</Figure>
										</Typography>
									</Stack>
									{(subsections ?? [{ label: null, items }]).map(({ label, items: subItems }) => (
										<Box key={label ?? heading} sx={label ? { mb: 1.5 } : undefined}>
											{label && (
												<Typography
													variant="body2"
													component="h3"
													sx={{ color: "text.secondary", mb: 0.5 }}
												>
													{label}
												</Typography>
											)}
											<Box
												sx={{
													display: "grid",
													gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
													gap: 1,
													...staggerChildren(),
												}}
											>
												{subItems.map((a) => (
													<AccountCard
														key={a.id}
														account={a}
														tint={tints.get(a.id) ?? "slate"}
														baseCurrency={user.base_currency}
														statement={statements.find((s) => s.account_id === a.id)}
														trend={trendOf.get(a.id)}
														onEdit={() => setEditing(a)}
														onDelete={() => setDeleting(a)}
													/>
												))}
											</Box>
										</Box>
									))}
								</Box>
							))}
						</Box>
					)}
				</TableCard>
			</PendingOverlay>

			<PendingOverlay>
				<ArchivedAccounts accounts={archived} onDelete={setDeleting} />
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
