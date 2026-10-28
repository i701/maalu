import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, useState } from "react";
import { z } from "zod";
import ActiveFilters from "#/components/ActiveFilters";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import ExportButton from "#/components/ExportButton";
import FiltersDrawer from "#/components/FiltersDrawer";
import MakeSubscriptionDialog from "#/components/MakeSubscriptionDialog";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import TonalChip from "#/components/TonalChip";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TransactionFilters from "#/components/TransactionFilters";
import TransactionForm from "#/components/TransactionForm";
import TransactionTotals from "#/components/TransactionTotals";
import BudgetAlert from "#/components/BudgetAlert";
import CategoryBreakdown from "#/components/CategoryBreakdown";
import { formatDate, formatMoney } from "#/lib/format";
import { PAYMENT_ACCENT, TRANSFER_ACCENT } from "#/lib/accents";
import { ACCENT } from "#/lib/m3";
import { useLiveSearch } from "#/lib/live-search";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import {
	buildActiveFilters,
	countActiveFilters,
	hasAnyFilter,
	pickFilterValues,
	type TransactionFilterValues,
} from "#/lib/transaction-filters";
import { unwrap } from "#/lib/unwrap";
import { getAccountFn, listAccountsFn } from "#/server/accounts";
import { listCurrenciesFn } from "#/server/currencies";
import { listSubscriptionsFn } from "#/server/subscriptions";
import {
	deleteTransactionFn,
	getCategoryTotalsFn,
	getTransactionTotalsFn,
	listTransactionsFn,
} from "#/server/transactions";
import { getBudgetFn } from "#/server/budget";
import { getCategoryFn, listCategoriesFn } from "#/server/categories";
import { getVendorFn, listVendorsFn } from "#/server/vendors";
import {
	ACCOUNT_GROUP_LABELS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	TRANSACTION_TYPES,
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
	category_id: z.uuid().optional().catch(undefined),
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
				deps.category_id ||
				deps.account_id ||
				deps.min_amount ||
				deps.max_amount ||
				deps.date_from ||
				deps.date_to,
			) && deps.type !== "transfer";
		const [
			transactions,
			vendors,
			subscriptions,
			accounts,
			currencies,
			totals,
			categories,
			allCategories,
			vendor,
			category,
			account,
			budget,
		] = await Promise.all([
			listTransactionsFn({ data: deps }),
			listVendorsFn(),
			listSubscriptionsFn(),
			listAccountsFn(),
			listCurrenciesFn(),
			wantsTotals ? getTransactionTotalsFn({ data: deps }) : Promise.resolve(null),
			wantsTotals ? getCategoryTotalsFn({ data: deps }) : Promise.resolve(null),
			// Names of the picked vendor/account, so the filter boxes show them without a list fetch.
			listCategoriesFn(),
			deps.vendor_id ? getVendorFn({ data: { id: deps.vendor_id } }) : Promise.resolve(null),
			deps.category_id ? getCategoryFn({ data: { id: deps.category_id } }) : Promise.resolve(null),
			deps.account_id ? getAccountFn({ data: { id: deps.account_id } }) : Promise.resolve(null),
			// for the "limits needing attention" strip; the page works without it
			getBudgetFn({ data: {} }),
		]);
		const rows = unwrap(transactions);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/transactions", search: { ...deps, page: last } });
		return {
			...rows,
			totals: totals ? unwrap(totals) : null,
			categories: categories ? unwrap(categories) : null,
			vendors: unwrap(vendors),
			subscriptions: unwrap(subscriptions),
			accounts: unwrap(accounts),
			currencies,
			allCategories: unwrap(allCategories),
			budget: budget.ok ? budget.data : null,
			selectedVendor: vendor?.ok ? { id: vendor.data.id, label: vendor.data.name } : null,
			selectedCategory: category?.ok ? { id: category.data.id, label: category.data.name } : null,
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
		: (t.vendor?.name ?? (t.splits.length > 1 ? "Split purchase" : t.category));
}

/** The category, or every category a split transaction touches. */
function txCategories(t: Transaction) {
	return t.splits.length > 1
		? [...new Set(t.splits.map((s) => s.category))].join(", ")
		: t.category;
}

function txSubtitle(t: Transaction) {
	return (
		t.type === "transfer"
			? [t.description]
			: [t.vendor || t.splits.length > 1 ? txCategories(t) : null, t.description]
	)
		.filter(Boolean)
		.join(" · ");
}

const TYPE_TILE = {
	income: { symbol: "arrow_downward", accent: ACCENT.green, shape: 1 },
	expense: { symbol: "arrow_upward", accent: ACCENT.pink, shape: 4 },
	transfer: { symbol: "payments", accent: ACCENT.blue, shape: 0 },
} as const;

/** The card's coloured, shaped icon: income green, expense pink, transfer blue. */
function TxTile({ type }: { type: Transaction["type"] }) {
	const k = TYPE_TILE[type];
	return (
		<ShapeTile shape={k.shape} size={52} accent={k.accent}>
			<Symbol name={k.symbol} size={24} filled />
		</ShapeTile>
	);
}

function TxMethodChip({ t }: { t: Transaction }) {
	return t.type === "transfer" ? (
		<TonalChip accent={TRANSFER_ACCENT} label="Transfer" />
	) : (
		<TonalChip
			accent={PAYMENT_ACCENT[t.payment_method]}
			label={PAYMENT_METHOD_LABELS[t.payment_method]}
		/>
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

/** The results table. Memoised so it only re-renders when the loaded rows change, not every time
 * a filter control updates (the controls follow the URL instantly; the rows follow the loader). */
const TransactionsTable = memo(function TransactionsTable({
	items,
	baseCurrency,
	onConvert,
	onEdit,
	onDelete,
}: {
	items: Transaction[];
	baseCurrency: string;
	onConvert: (t: Transaction) => void;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	return (
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
						<TxAmount t={t} baseCurrency={baseCurrency} />
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<TxActions
							t={t}
							onConvert={() => onConvert(t)}
							onEdit={() => onEdit(t)}
							onDelete={() => onDelete(t)}
						/>
					</TableCell>
				</TableRow>
			)}
			renderCard={(t) => (
				<MobileCard
					leading={<TxTile type={t.type} />}
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
					end={<TxAmount t={t} baseCurrency={baseCurrency} />}
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
							onConvert={() => onConvert(t)}
							onEdit={() => onEdit(t)}
							onDelete={() => onDelete(t)}
						/>
					}
				/>
			)}
		/>
	);
});

/** The frosted pills in the page hero: how many transactions, and how many filters are on. */
function heroStats(total: number, activeCount: number) {
	const pills = [
		{ symbol: "receipt_long", label: `${total} ${total === 1 ? "transaction" : "transactions"}` },
	];
	if (activeCount > 0)
		pills.push({
			symbol: "tune",
			label: `${activeCount} ${activeCount === 1 ? "filter" : "filters"}`,
		});
	return pills;
}

function TransactionsPage() {
	const {
		items,
		total,
		totals,
		categories,
		vendors,
		subscriptions,
		accounts,
		currencies,
		selectedVendor,
		selectedCategory,
		allCategories,
		budget,
		selectedAccount,
	} = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	// The URL as soon as it changes (the loader data lags behind it), so controls feel instant.
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({
				to: Route.fullPath,
				search: (p) => ({ ...p, page }),
			});
	};
	const [editing, setEditing] = useState<Transaction | "new" | null>(null);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const [converting, setConverting] = useState<Transaction | null>(null);

	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	const filtered = hasAnyFilter(search);
	const filterValues = pickFilterValues(search);
	const activeCount = countActiveFilters(search);

	const patch = (p: Partial<TransactionFilterValues>) =>
		navigate({ search: (prev) => ({ ...prev, page: 1, ...p }) });
	const clearAll = () => navigate({ search: (p) => ({ page: 1, pageSize: p.pageSize, q: p.q }) });

	const activeFilters = buildActiveFilters({
		filters: filterValues,
		selectedAccount,
		selectedVendor,
		selectedCategory,
		baseCurrency: user.base_currency,
		patch,
	});

	const filterPanel = (
		<TransactionFilters
			filters={filterValues}
			selectedAccount={selectedAccount}
			selectedVendor={selectedVendor}
			selectedCategory={selectedCategory}
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
				symbol="receipt_long"
				accent="blue"
				shape={0}
				description={`Amounts are totalled in ${user.base_currency}.`}
				stats={heroStats(total, activeCount)}
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add transaction
					</Button>
				}
			/>

			<BudgetAlert budget={budget} />

			<Box sx={{ containerType: "inline-size" }}>
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: "minmax(0, 1fr)",
						[WIDE]: {
							gridTemplateColumns: `${ASIDE_WIDTH}px minmax(0, 1fr)`,
							alignItems: "start",
						},
					}}
				>
					{/* Filter panel beside the table on wide layouts (hidden otherwise). */}
					<Box
						component="aside"
						aria-label="Filters"
						sx={{
							display: "none",
							[WIDE]: { display: "block", position: "sticky", top: 88 },
						}}
					>
						<Card>
							<CardContent sx={{ p: 2.5 }}>{filterPanel}</CardContent>
						</Card>
					</Box>

					<Box sx={{ minWidth: 0 }}>
						<PendingOverlay>
							<TransactionTotals totals={totals} />
							<CategoryBreakdown categories={categories} />

							<TableCard>
								<TableToolbar
									summary={`${total} ${total === 1 ? "transaction" : "transactions"}`}
									actions={<ExportButton filters={{ q: search.q, ...filterValues }} />}
									filters={
										<>
											<SearchField
												value={search.q ?? ""}
												placeholder="Search category, vendor, note…"
												onChange={(q) =>
													navigate({
														search: (p) => ({
															...p,
															page: 1,
															q: q || undefined,
														}),
													})
												}
											/>
											{/* Only on narrow layouts: wide ones show the panel beside the table. */}
											<FiltersDrawer
												activeCount={activeCount}
												total={total}
												sx={{
													display: "inline-flex",
													[WIDE]: { display: "none" },
												}}
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
									<EmptyState
										firstRun={!filtered}
										symbol={filtered ? "search" : "receipt_long"}
										accent={filtered ? "slate" : "blue"}
										shape={0}
									>
										{filtered
											? "No transactions match these filters."
											: "No transactions yet. Add your first one."}
									</EmptyState>
								) : (
									<TransactionsTable
										items={items}
										baseCurrency={user.base_currency}
										onConvert={setConverting}
										onEdit={setEditing}
										onDelete={setDeleting}
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
					categories={allCategories}
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
					title="Move to trash"
					message={`Move this ${formatMoney(deleting.amount, deleting.currency)} transaction to the trash? It stops counting toward your totals, and you can restore it from the Trash page.`}
					confirmLabel="Move to trash"
					doneMessage="Moved to trash"
					onConfirm={() => deleteTransactionFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
