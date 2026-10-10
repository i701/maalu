import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import ActiveFilters, { type ActiveFilter } from "#/components/ActiveFilters";
import ConfirmDelete from "#/components/ConfirmDelete";
import MobileCard from "#/components/MobileCard";
import EmptyState from "#/components/EmptyState";
import ExportButton from "#/components/ExportButton";
import FiltersDrawer from "#/components/FiltersDrawer";
import MakeSubscriptionDialog from "#/components/MakeSubscriptionDialog";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import Reveal from "#/components/Reveal";
import TableCard from "#/components/TableCard";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TransactionFilters from "#/components/TransactionFilters";
import TransactionForm from "#/components/TransactionForm";
import { formatDate, formatMoney } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { useLastDefined } from "#/lib/motion";
import { pageSearch, useClampPage } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import {
	deleteTransactionFn,
	getTransactionTotalsFn,
	listTransactionsFn,
} from "#/server/transactions";
import { getAccountFn, listAccountsFn } from "#/server/accounts";
import { listCurrenciesFn } from "#/server/currencies";
import { listSubscriptionsFn } from "#/server/subscriptions";
import { getVendorFn, listVendorsFn } from "#/server/vendors";
import {
	ACCOUNT_GROUP_LABELS,
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	TRANSACTION_TYPES,
	TRANSACTION_TYPE_LABELS,
	type Transaction,
} from "#/types/api";

/** Amounts are stored positive; the type decides the sign shown and the colour. */
const TYPE_SIGN = { income: "+", expense: "−", transfer: "" } as const;
const TYPE_AMOUNT_COLOR = {
	income: "success.main",
	expense: "error.main",
	transfer: "text.primary",
} as const;

// The filter panel sits beside the table once its own container is this wide; below that the same
// panel opens from a "Filters" button. The table needs ~760px, so 260 (panel) + 16 + 760.
const ASIDE_WIDTH = 260;
const WIDE = "@container (min-width: 1040px)";

// coerce: a typed ?min_amount=100 arrives as a number (the router only quotes strings it writes)
const decimal = z.coerce
	.string()
	.regex(/^\d+(\.\d{1,4})?$/)
	.optional()
	.catch(undefined);

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	type: z.enum(TRANSACTION_TYPES).optional().catch(undefined),
	payment_method: z.enum(PAYMENT_METHODS).optional().catch(undefined),
	vendor_id: z.uuid().optional().catch(undefined),
	account_id: z.uuid().optional().catch(undefined),
	min_amount: decimal,
	max_amount: decimal,
	date_from: z.iso.date().optional().catch(undefined),
	date_to: z.iso.date().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/transactions")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		// Totals are only shown (and only fetched) while a filter is applied. A transfer filter has
		// nothing to total, since transfers aren't income or expense.
		const wantsTotals =
			Boolean(
				deps.q ||
				deps.type ||
				deps.payment_method ||
				deps.vendor_id ||
				deps.account_id ||
				deps.min_amount ||
				deps.max_amount ||
				deps.date_from ||
				deps.date_to,
			) && deps.type !== "transfer";
		const [transactions, vendors, subscriptions, accounts, currencies, totals, vendor, account] =
			await Promise.all([
				listTransactionsFn({ data: deps }),
				listVendorsFn(),
				listSubscriptionsFn(),
				listAccountsFn(),
				listCurrenciesFn(),
				wantsTotals ? getTransactionTotalsFn({ data: deps }) : Promise.resolve(null),
				// Names of the picked vendor/account, so the filter boxes show them without a list fetch.
				deps.vendor_id ? getVendorFn({ data: { id: deps.vendor_id } }) : Promise.resolve(null),
				deps.account_id ? getAccountFn({ data: { id: deps.account_id } }) : Promise.resolve(null),
			]);
		return {
			...unwrap(transactions),
			totals: totals ? unwrap(totals) : null,
			vendors: unwrap(vendors),
			subscriptions: unwrap(subscriptions),
			accounts: unwrap(accounts),
			currencies,
			selectedVendor: vendor?.ok ? { id: vendor.data.id, label: vendor.data.name } : null,
			selectedAccount: account?.ok
				? {
						id: account.data.id,
						label: account.data.name,
						hint: `${ACCOUNT_GROUP_LABELS[account.data.group]} · ${account.data.currency}`,
					}
				: null,
		};
	},
	component: TransactionsPage,
});

/** Pieces shared by the desktop row and the mobile card, so both always show the same facts. */
function txTitle(t: Transaction) {
	return t.type === "transfer"
		? `${t.account?.name ?? "Deleted account"} → ${t.to_account?.name ?? "Deleted account"}`
		: (t.vendor?.name ?? t.category);
}

function txSubtitle(t: Transaction) {
	return (t.type === "transfer" ? [t.description] : [t.vendor ? t.category : null, t.description])
		.filter(Boolean)
		.join(" · ");
}

function TxMethodChip({ t }: { t: Transaction }) {
	return t.type === "transfer" ? (
		<Chip size="small" color="info" label="Transfer" />
	) : (
		<Chip size="small" label={PAYMENT_METHOD_LABELS[t.payment_method]} />
	);
}

function TxSubscriptionChip({ t }: { t: Transaction }) {
	if (!t.subscription) return null;
	return (
		<Chip
			icon={<AutorenewIcon />}
			label={t.subscription.name}
			size="small"
			variant="outlined"
			sx={{ display: "flex", width: "fit-content" }}
		/>
	);
}

function TxAmount({ t, baseCurrency }: { t: Transaction; baseCurrency: string }) {
	return (
		<>
			<Typography variant="body2" sx={{ fontWeight: 600, color: TYPE_AMOUNT_COLOR[t.type] }}>
				{TYPE_SIGN[t.type]}
				{formatMoney(t.amount, t.currency)}
			</Typography>
			{t.type === "transfer" && t.to_account && t.to_account.currency !== t.currency && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
					→ {formatMoney(t.to_amount ?? "0", t.to_account.currency)}
				</Typography>
			)}
			{t.type !== "transfer" && t.currency !== baseCurrency && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
					≈ {TYPE_SIGN[t.type]}
					{formatMoney(t.base_amount, baseCurrency)} @ {Number(t.exchange_rate)}
				</Typography>
			)}
		</>
	);
}

function TxActions({
	t,
	onConvert,
	onEdit,
	onDelete,
}: {
	t: Transaction;
	onConvert: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<>
			{t.type === "expense" && !t.subscription && (
				<IconButton
					aria-label="Make subscription"
					title="Make subscription"
					size="small"
					onClick={onConvert}
				>
					<AutorenewIcon fontSize="small" />
				</IconButton>
			)}
			<IconButton aria-label="Edit" title="Edit" size="small" onClick={onEdit}>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

function TransactionsPage() {
	const {
		items,
		total,
		totals,
		vendors,
		subscriptions,
		accounts,
		currencies,
		selectedVendor,
		selectedAccount,
	} = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const committed = Route.useSearch(); // matches the rows on screen
	const search = useLiveSearch(searchSchema); // matches the controls: updates instantly
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};
	const [editing, setEditing] = useState<Transaction | "new" | null>(null);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const [converting, setConverting] = useState<Transaction | null>(null);

	const shownTotals = useLastDefined(totals); // keeps content while the cards close

	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });
	useClampPage({
		page: committed.page,
		pageSize: committed.pageSize,
		total,
		itemCount: items.length,
		setPage,
	});

	const filtered = Boolean(
		search.q ||
		search.type ||
		search.payment_method ||
		search.vendor_id ||
		search.account_id ||
		search.min_amount ||
		search.max_amount ||
		search.date_from ||
		search.date_to,
	);

	const filterValues = {
		type: search.type,
		payment_method: search.payment_method,
		account_id: search.account_id,
		vendor_id: search.vendor_id,
		min_amount: search.min_amount,
		max_amount: search.max_amount,
		date_from: search.date_from,
		date_to: search.date_to,
	};
	// How many structured filters are on (an amount range counts once). Search is separate.
	const activeCount =
		[search.type, search.payment_method, search.account_id, search.vendor_id].filter(Boolean)
			.length +
		(search.min_amount || search.max_amount ? 1 : 0) +
		(search.date_from || search.date_to ? 1 : 0);

	const patch = (p: Partial<typeof filterValues>) =>
		navigate({ search: (prev) => ({ ...prev, page: 1, ...p }) });
	const clearAll = () => navigate({ search: (p) => ({ page: 1, pageSize: p.pageSize, q: p.q }) });

	const activeFilters: ActiveFilter[] = [];
	if (search.type)
		activeFilters.push({
			key: "type",
			tone: "primary",
			label: `Type: ${TRANSACTION_TYPE_LABELS[search.type]}`,
			onDelete: () => patch({ type: undefined }),
		});
	if (search.date_from || search.date_to)
		activeFilters.push({
			key: "date",
			tone: "info",
			label:
				search.date_from && search.date_to
					? `Date: ${formatDate(search.date_from)} – ${formatDate(search.date_to)}`
					: search.date_from
						? `Date: from ${formatDate(search.date_from)}`
						: `Date: until ${formatDate(search.date_to!)}`,
			onDelete: () => patch({ date_from: undefined, date_to: undefined }),
		});
	if (search.account_id)
		activeFilters.push({
			key: "account",
			tone: "success",
			label: `Account: ${selectedAccount?.label ?? "…"}`,
			onDelete: () => patch({ account_id: undefined }),
		});
	if (search.vendor_id)
		activeFilters.push({
			key: "vendor",
			tone: "warning",
			label: `Vendor: ${selectedVendor?.label ?? "…"}`,
			onDelete: () => patch({ vendor_id: undefined }),
		});
	if (search.payment_method)
		activeFilters.push({
			key: "method",
			tone: "secondary",
			label: `Method: ${PAYMENT_METHOD_LABELS[search.payment_method]}`,
			onDelete: () => patch({ payment_method: undefined }),
		});
	if (search.min_amount || search.max_amount)
		activeFilters.push({
			key: "amount",
			tone: "error",
			label:
				search.min_amount && search.max_amount
					? `Amount: ${search.min_amount} – ${search.max_amount} ${user.base_currency}`
					: search.min_amount
						? `Amount: ≥ ${search.min_amount} ${user.base_currency}`
						: `Amount: ≤ ${search.max_amount} ${user.base_currency}`,
			onDelete: () => patch({ min_amount: undefined, max_amount: undefined }),
		});

	const filterPanel = (
		<TransactionFilters
			filters={filterValues}
			selectedAccount={selectedAccount}
			selectedVendor={selectedVendor}
			baseCurrency={user.base_currency}
			activeCount={activeCount}
			onChange={patch}
			onClear={clearAll}
		/>
	);

	return (
		<>
			<PageHeader
				title="Transactions"
				description={`Amounts are totalled in ${user.base_currency}.`}
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add transaction
					</Button>
				}
			/>

			<Box sx={{ containerType: "inline-size" }}>
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: "minmax(0, 1fr)",
						[WIDE]: { gridTemplateColumns: `${ASIDE_WIDTH}px minmax(0, 1fr)`, alignItems: "start" },
					}}
				>
					{/* Filter panel beside the table on wide layouts (hidden otherwise). */}
					<Box
						component="aside"
						aria-label="Filters"
						sx={{ display: "none", [WIDE]: { display: "block", position: "sticky", top: 88 } }}
					>
						<Card>
							<CardContent sx={{ p: 2.5 }}>{filterPanel}</CardContent>
						</Card>
					</Box>

					<Box sx={{ minWidth: 0 }}>
						{/* The cards open/close smoothly instead of popping in and shoving the table down. */}
						<PendingOverlay>
							<Reveal in={Boolean(totals)}>
								{shownTotals && (
									<Grid container spacing={2} sx={{ pb: 2 }}>
										<Grid size={{ xs: 12, sm: 6 }}>
											<Card>
												<CardContent>
													<Typography variant="body2" sx={{ color: "text.secondary" }}>
														Income in these results
													</Typography>
													<Typography
														variant="h2"
														component="p"
														sx={{ mt: 0.5, color: "success.main" }}
													>
														{formatMoney(shownTotals.income, shownTotals.currency)}
													</Typography>
												</CardContent>
											</Card>
										</Grid>
										<Grid size={{ xs: 12, sm: 6 }}>
											<Card>
												<CardContent>
													<Typography variant="body2" sx={{ color: "text.secondary" }}>
														Expense in these results
													</Typography>
													<Typography
														variant="h2"
														component="p"
														sx={{ mt: 0.5, color: "error.main" }}
													>
														{formatMoney(shownTotals.expense, shownTotals.currency)}
													</Typography>
												</CardContent>
											</Card>
										</Grid>
									</Grid>
								)}
							</Reveal>

							<TableCard>
								<TableToolbar
									summary={`${total} ${total === 1 ? "transaction" : "transactions"}`}
									actions={
										<ExportButton
											filters={{
												q: search.q,
												type: search.type,
												payment_method: search.payment_method,
												vendor_id: search.vendor_id,
												account_id: search.account_id,
												min_amount: search.min_amount,
												max_amount: search.max_amount,
												date_from: search.date_from,
												date_to: search.date_to,
											}}
										/>
									}
									filters={
										<>
											<SearchField
												value={search.q ?? ""}
												placeholder="Search category, vendor, note…"
												onChange={(q) =>
													navigate({ search: (p) => ({ ...p, page: 1, q: q || undefined }) })
												}
											/>
											{/* Only on narrow layouts: wide ones show the panel beside the table. */}
											<FiltersDrawer
												activeCount={activeCount}
												total={total}
												sx={{ display: "inline-flex", [WIDE]: { display: "none" } }}
											>
												{filterPanel}
											</FiltersDrawer>
										</>
									}
								/>

								{/* Wide layouts already show the panel; narrow ones get removable chips. */}
								<ActiveFilters
									filters={activeFilters}
									onClear={clearAll}
									sx={{ [WIDE]: { display: "none" } }}
								/>

								{items.length === 0 ? (
									<EmptyState firstRun={!filtered}>
										{filtered
											? "No transactions match these filters."
											: "No transactions yet. Add your first one."}
									</EmptyState>
								) : (
									<ResponsiveTable
										rows={items}
										getKey={(t) => t.id}
										minWidth={820}
										head={
											<TableRow>
												<TableCell>Date</TableCell>
												<TableCell>Details</TableCell>
												<TableCell>Method</TableCell>
												<TableCell align="right">Amount</TableCell>
												<TableCell align="right" sx={{ width: 100 }} />
											</TableRow>
										}
										renderRow={(t) => (
											<TableRow hover>
												<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
													{formatDate(t.transaction_date)}
												</TableCell>
												<TableCell>
													<Typography variant="body2" sx={{ fontWeight: 500 }}>
														{txTitle(t)}
													</Typography>
													<Typography variant="caption" sx={{ color: "text.secondary" }}>
														{txSubtitle(t)}
													</Typography>
													{t.subscription && (
														<Box sx={{ mt: 0.5 }}>
															<TxSubscriptionChip t={t} />
														</Box>
													)}
												</TableCell>
												<TableCell>
													<TxMethodChip t={t} />
													{t.type !== "transfer" && t.account && (
														<Typography
															variant="caption"
															sx={{ display: "block", color: "text.secondary", mt: 0.5 }}
														>
															{t.account.name}
														</Typography>
													)}
												</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													<TxAmount t={t} baseCurrency={user.base_currency} />
												</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													<TxActions
														t={t}
														onConvert={() => setConverting(t)}
														onEdit={() => setEditing(t)}
														onDelete={() => setDeleting(t)}
													/>
												</TableCell>
											</TableRow>
										)}
										renderCard={(t) => (
											<MobileCard
												primary={
													<Typography variant="body2" sx={{ fontWeight: 500 }}>
														{txTitle(t)}
													</Typography>
												}
												secondary={
													txSubtitle(t) && (
														<Typography variant="caption" sx={{ color: "text.secondary" }}>
															{txSubtitle(t)}
														</Typography>
													)
												}
												end={<TxAmount t={t} baseCurrency={user.base_currency} />}
												meta={
													<>
														<Typography variant="caption" sx={{ color: "text.secondary" }}>
															{formatDate(t.transaction_date)}
														</Typography>
														<TxMethodChip t={t} />
														{t.type !== "transfer" && t.account && (
															<Typography variant="caption" sx={{ color: "text.secondary" }}>
																{t.account.name}
															</Typography>
														)}
														<TxSubscriptionChip t={t} />
													</>
												}
												actions={
													<TxActions
														t={t}
														onConvert={() => setConverting(t)}
														onEdit={() => setEditing(t)}
														onDelete={() => setDeleting(t)}
													/>
												}
											/>
										)}
									/>
								)}

								<TablePager
									onPrefetch={prefetchPage}
									total={total}
									page={search.page}
									pageSize={search.pageSize}
									onPageChange={setPage}
									onPageSizeChange={(pageSize) =>
										navigate({ search: (p) => ({ ...p, page: 1, pageSize }) })
									}
								/>
							</TableCard>
						</PendingOverlay>
					</Box>
				</Box>
			</Box>

			{editing && (
				<TransactionForm
					transaction={editing === "new" ? undefined : editing}
					vendors={vendors}
					subscriptions={subscriptions}
					accounts={accounts}
					currencies={currencies}
					baseCurrency={user.base_currency}
					onClose={() => setEditing(null)}
				/>
			)}
			{converting && (
				<MakeSubscriptionDialog transaction={converting} onClose={() => setConverting(null)} />
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete transaction"
					message={`Delete this ${formatMoney(deleting.amount, deleting.currency)} transaction? This can't be undone.`}
					onConfirm={() => deleteTransactionFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
