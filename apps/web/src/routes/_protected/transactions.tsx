import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, startTransition, useCallback, useMemo, useOptimistic, useState } from "react";
import { z } from "zod";
import ActiveFilters from "#/components/ActiveFilters";
import BudgetAlert from "#/components/BudgetAlert";
import BulkEditDialog from "#/components/BulkEditDialog";
import CategoryBreakdown from "#/components/CategoryBreakdown";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import ExportButton from "#/components/ExportButton";
import FiltersDrawer from "#/components/FiltersDrawer";
import GroupDialog from "#/components/GroupDialog";
import MakeSubscriptionDialog from "#/components/MakeSubscriptionDialog";
import MakeTransferDialog from "#/components/MakeTransferDialog";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import RefundDialogHost from "#/components/RefundDialogHost";
import ResponsiveTable from "#/components/ResponsiveTable";
import SalarySplitHost from "#/components/SalarySplitHost";
import SearchField from "#/components/SearchField";
import SelectAllMatching from "#/components/SelectAllMatching";
import SelectionBar from "#/components/SelectionBar";
import ShapeTile from "#/components/ShapeTile";
import IconSymbol from "#/components/Symbol";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TonalChip from "#/components/TonalChip";
import TransactionFilters from "#/components/TransactionFilters";
import TransactionForm from "#/components/TransactionForm";
import TransactionTotals from "#/components/TransactionTotals";
import TransferSuggestionsCard from "#/components/TransferSuggestionsCard";
import { seedFromTransaction } from "#/components/transaction-form/request";
import TransactionDrawer from "#/components/transactions/TransactionDrawer";
import { TxAmount } from "#/components/transactions/TxParts";
import UpcomingCard from "#/components/UpcomingCard";
import { excludedNote } from "#/lib/accounts";
import { transactionCount } from "#/lib/bulk-message";
import { CardMorph } from "#/lib/card-morph";
import { cardFilterLabel } from "#/lib/cards";
import { formatMoney, formatWhen } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { isOverdue, localToday } from "#/lib/planned";
import { isRefund } from "#/lib/refund";
import { type SelectionState, useSelection } from "#/lib/selection";
import {
	buildActiveFilters,
	countActiveFilters,
	hasAnyFilter,
	pickFilterValues,
	type TransactionFilterValues,
	type TransactionSearch,
	tagNamesOf,
} from "#/lib/transaction-filters";
import { linkablePair } from "#/lib/transfer-link";
import { dayHeading, txRowLine, txRowTitle, txTitle } from "#/lib/tx-display";
import { unwrap } from "#/lib/unwrap";
import { useRefundDialog } from "#/lib/use-refund-dialog";
import { useSalarySplit } from "#/lib/use-salary-split";
import { useViewMode } from "#/lib/view-mode";
import { getAccountFn, listAccountsFn } from "#/server/accounts";
import { getMeFn } from "#/server/auth";
import { getBudgetFn } from "#/server/budget";
import { listCardsFn } from "#/server/cards";
import { getCategoryFn, listCategoriesFn } from "#/server/categories";
import { listCurrenciesFn } from "#/server/currencies";
import { listGroupsFn } from "#/server/groups";
import { listSalaryRulesFn } from "#/server/salary";
import { listSubscriptionsFn } from "#/server/subscriptions";
import { listTagsFn } from "#/server/tags";
import { listTemplatesFn } from "#/server/templates";
import {
	bulkTrashFn,
	deleteTransactionFn,
	getCategoryTotalsFn,
	getTransactionTotalsFn,
	listMatchingIdsFn,
	listTransactionsFn,
	listTransferSuggestionsFn,
	listUpcomingFn,
} from "#/server/transactions";
import { getVendorFn, listVendorsFn } from "#/server/vendors";
import {
	ACCOUNT_GROUP_LABELS,
	type Category,
	PAYMENT_METHODS,
	type Tag,
	TRANSACTION_TYPES,
	type Transaction,
	type TransactionGroup,
	type Vendor,
} from "#/types/api";

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
	tag_ids: z.array(z.uuid()).max(10).optional().catch(undefined),
	tag_match: z.enum(["any", "all"]).optional().catch(undefined),
	sorted_as: z.enum(["need", "want", "unsorted"]).optional().catch(undefined),
	account_id: z.uuid().optional().catch(undefined),
	card_id: z.uuid().optional().catch(undefined),
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
				deps.tag_ids?.length ||
				deps.account_id ||
				deps.card_id ||
				deps.sorted_as ||
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
			templates,
			allTags,
			me,
			upcoming,
			currencies,
			totals,
			categories,
			allCategories,
			vendor,
			category,
			account,
			budget,
			suggestions,
			groups,
			salaryRules,
			cards,
		] = await Promise.all([
			listTransactionsFn({ data: deps }),
			listVendorsFn(),
			listSubscriptionsFn(),
			listAccountsFn(),
			listTemplatesFn(),
			listTagsFn(),
			getMeFn(),
			listUpcomingFn({ data: { days: 10 } }),
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
			// pairs that look like one transfer entered twice; the page works without them
			listTransferSuggestionsFn(),
			// for the "Group" action's list of groups to add to
			listGroupsFn(),
			// whether adding a salary should offer to split it
			listSalaryRulesFn(),
			// to pick the card a purchase was paid with, and to filter by it
			listCardsFn(),
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
			cards: unwrap(cards),
			// switched off in Settings: no templates to start from (they stay on the Templates page)
			templates: me.ok && !me.data.start_from_template ? [] : unwrap(templates),
			allTags: unwrap(allTags),
			defaultAccountId: me.ok ? me.data.default_account_id : null,
			upcoming: unwrap(upcoming),
			currencies,
			allCategories: unwrap(allCategories),
			budget: budget.ok ? budget.data : null,
			allGroups: groups.ok ? groups.data : [],
			transferSuggestions: suggestions.ok ? suggestions.data : [],
			hasSalaryRules: salaryRules.ok && salaryRules.data.length > 0,
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
const TYPE_TILE = {
	income: { symbol: "arrow_downward", accent: ACCENT.green, shape: 1 },
	expense: { symbol: "arrow_upward", accent: ACCENT.pink, shape: 4 },
	transfer: { symbol: "payments", accent: ACCENT.blue, shape: 0 },
} as const;

const REFUND_TILE = { symbol: "undo", accent: ACCENT.green, shape: 1 } as const;

/** The card's coloured, shaped icon: income green, expense pink, transfer blue, refund green. */
/** The line under a transaction's title, led by a dot in its category's colour when it has just one. */
/** What the delete dialog says: skipping a subscription's planned payment, or moving to the trash. */
function deleteCopy(t: Transaction) {
	const amount = formatMoney(t.amount, t.currency);
	if (t.planned && t.subscription) {
		return {
			title: "Skip this payment",
			message: `Skip this ${amount} payment for ${t.subscription.name}? It moves to the trash and the subscription plans its next payment instead.`,
			confirmLabel: "Skip",
			doneMessage: "Skipped",
		};
	}
	return {
		title: "Move to trash",
		message: `Move this ${amount} transaction to the trash? It stops counting toward your totals, and you can restore it from the Trash page.`,
		confirmLabel: "Move to trash",
		doneMessage: "Moved to trash",
	};
}

function TxTile({ t, size = 52 }: { t: Transaction; size?: number }) {
	const k = isRefund(t) ? REFUND_TILE : TYPE_TILE[t.type];
	return (
		<ShapeTile shape={k.shape} size={size} accent={k.accent}>
			<IconSymbol name={k.symbol} size={size > 40 ? 24 : 20} filled />
		</ShapeTile>
	);
}

/** The results table. Memoised so it only re-renders when the loaded rows change, not every time
 * a filter control updates (the controls follow the URL instantly; the rows follow the loader). */
const TransactionsTable = memo(function TransactionsTable({
	items,
	selected,
	selectionState,
	onToggle,
	onToggleAll,
	baseCurrency,
	onOpen,
}: {
	items: Transaction[];
	selected: ReadonlySet<string>;
	selectionState: SelectionState;
	onToggle: (id: string) => void;
	onToggleAll: () => void;
	baseCurrency: string;
	onOpen: (t: Transaction) => void;
}) {
	const today = useMemo(() => localToday(), []);
	return (
		<ResponsiveTable
			rows={items}
			getKey={(t) => t.id}
			minWidth={560}
			groups={{
				key: (t) => t.transaction_date,
				label: (date) => dayHeading(date, today),
				colSpan: 3,
			}}
			head={
				<TableRow>
					<TableCell padding="checkbox">
						<Checkbox
							size="small"
							checked={selectionState === "all"}
							indeterminate={selectionState === "some"}
							onChange={onToggleAll}
							slotProps={{
								input: { "aria-label": "Select all transactions on this page" },
							}}
						/>
					</TableCell>
					<TableCell>Details</TableCell>
					<TableCell align="right">Amount</TableCell>
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow
					hover
					selected={selected.has(t.id)}
					onClick={() => onOpen(t)}
					sx={{ cursor: "pointer" }}
				>
					<TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
						<Checkbox
							size="small"
							checked={selected.has(t.id)}
							onChange={() => onToggle(t.id)}
							slotProps={{ input: { "aria-label": `Select ${txTitle(t)}` } }}
						/>
					</TableCell>
					<TableCell>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
							<TxTile t={t} size={36} />
							<Box sx={{ minWidth: 0 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										component="button"
										type="button"
										sx={{
											all: "unset",
											cursor: "pointer",
											fontSize: "0.875rem",
											fontWeight: 500,
											borderRadius: "var(--shape-xs)",
											"&:focus-visible": {
												outline: "2px solid var(--md-sys-color-primary)",
											},
										}}
									>
										{txRowTitle(t)}
									</Box>
									<TxStatusPill t={t} today={today} />
								</Box>
								<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
									{txRowLine(t)}
								</Typography>
							</Box>
						</Box>
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<TxAmount t={t} baseCurrency={baseCurrency} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(t) => (
				<MobileCard
					select={
						<Checkbox
							size="small"
							checked={selected.has(t.id)}
							onChange={() => onToggle(t.id)}
							slotProps={{ input: { "aria-label": `Select ${txTitle(t)}` } }}
							sx={{ ml: -0.75, mt: 0.5, alignSelf: "flex-start" }}
						/>
					}
					leading={<TxTile t={t} />}
					primary={
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{txRowTitle(t)}
							</Typography>
							<TxStatusPill t={t} today={today} />
						</Box>
					}
					secondary={
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{txRowLine(t)}
						</Typography>
					}
					end={<TxAmount t={t} baseCurrency={baseCurrency} />}
					endSecondary={<CardsDate t={t} />}
					onOpen={() => onOpen(t)}
				/>
			)}
		/>
	);
});

/** "Planned" or "Overdue" beside a title: the one status worth a glance in the list. */
function TxStatusPill({ t, today }: { t: Transaction; today: string }) {
	if (!t.planned) return null;
	const late = isOverdue(t, today);
	return (
		<TonalChip accent={late ? ACCENT.pink : ACCENT.amber} label={late ? "Overdue" : "Planned"} />
	);
}

/** The date under a card's amount, only in the cards view: the table view has day headings. */
function CardsDate({ t }: { t: Transaction }) {
	if (useViewMode() !== "cards") return null;
	return (
		<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
			{formatWhen(t.transaction_date, t.transaction_time)}
		</Typography>
	);
}

/** The table with row selection: a bar for the selected rows, and the dialogs for what it offers. */
function TransactionList({
	items,
	baseCurrency,
	categories,
	vendors,
	tags,
	groups,
	onConvert,
	onSplit,
	onRefund,
	onDuplicate,
	onEdit,
	onDelete,
	total,
	search,
}: {
	items: Transaction[];
	baseCurrency: string;
	categories: Category[];
	vendors: Vendor[];
	tags: Tag[];
	/** Every group, for adding the selection to one. */
	groups: TransactionGroup[];
	/** How many transactions match the filters, over every page. */
	total: number;
	search: TransactionSearch;
	onConvert: (t: Transaction) => void;
	onSplit: (t: Transaction) => void;
	onRefund: (t: Transaction) => void;
	onDuplicate: (t: Transaction) => void;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	const selection = useSelection(items.map((t) => t.id));
	// The ids the open dialog is about, fixed when it opened (the selection resets once rows move).
	const [editing, setEditing] = useState<string[] | null>(null);
	const [deleting, setDeleting] = useState<string[] | null>(null);
	const [grouping, setGrouping] = useState<string[] | null>(null);
	// two selected transactions that are the two sides of one transfer can be made one
	const pair = useMemo(
		() => (selection.wide ? null : linkablePair(items.filter((t) => selection.selected.has(t.id)))),
		[items, selection.selected, selection.wide],
	);
	const [linking, setLinking] = useState(false);
	// the transaction whose drawer is open; the id stays while the drawer slides out
	const [openId, setOpenId] = useState<string | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<>
			<SelectionBar
				count={selection.selectedIds.length}
				onClear={selection.clear}
				extra={
					<SelectAllMatching
						total={total}
						pageCount={items.length}
						state={selection.state}
						wide={selection.wide}
						load={() =>
							listMatchingIdsFn({
								data: { ...pickFilterValues(search), q: search.q },
							})
						}
						onLoaded={selection.selectAll}
					/>
				}
			>
				<Button
					size="small"
					color="inherit"
					startIcon={<EditOutlinedIcon />}
					onClick={() => setEditing(selection.selectedIds)}
				>
					Edit
				</Button>
				<Button
					size="small"
					color="inherit"
					startIcon={<Inventory2OutlinedIcon />}
					onClick={() => setGrouping(selection.selectedIds)}
				>
					Group
				</Button>
				{pair && (
					<Button
						size="small"
						color="inherit"
						startIcon={<SwapHorizIcon />}
						onClick={() => setLinking(true)}
					>
						Make a transfer
					</Button>
				)}
				<Button
					size="small"
					color="inherit"
					startIcon={<DeleteOutlineIcon />}
					onClick={() => setDeleting(selection.selectedIds)}
				>
					Move to trash
				</Button>
			</SelectionBar>
			<TransactionsTable
				items={items}
				baseCurrency={baseCurrency}
				selected={selection.selected}
				selectionState={selection.state}
				onToggle={selection.toggle}
				onToggleAll={selection.toggleAll}
				onOpen={(t) => {
					setOpenId(t.id);
					setDrawerOpen(true);
				}}
			/>
			<TransactionDrawer
				transaction={items.find((t) => t.id === openId) ?? null}
				open={drawerOpen}
				baseCurrency={baseCurrency}
				onClose={() => setDrawerOpen(false)}
				onConvert={onConvert}
				onSplit={onSplit}
				onRefund={onRefund}
				onDuplicate={onDuplicate}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
			{editing && (
				<BulkEditDialog
					ids={editing}
					categories={categories}
					vendors={vendors}
					tags={tags}
					onClose={() => setEditing(null)}
					onDone={selection.clear}
				/>
			)}
			{linking && pair && (
				<MakeTransferDialog
					expense={pair.expense}
					income={pair.income}
					onClose={() => setLinking(false)}
					onDone={selection.clear}
				/>
			)}
			{grouping && (
				<GroupDialog
					ids={grouping}
					groups={groups}
					onClose={() => setGrouping(null)}
					onDone={selection.clear}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Move to trash"
					message={`Move ${transactionCount(deleting.length)} to the trash? They stop counting toward your totals, and you can restore them from the Trash page.`}
					confirmLabel="Move to trash"
					doneMessage={`Moved ${transactionCount(deleting.length)} to the trash`}
					onConfirm={async () => {
						const res = await bulkTrashFn({ data: { ids: deleting } });
						if (!res.ok) return res;
						selection.clear();
						return { ok: true as const, data: undefined };
					}}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}

/** The frosted pills in the page hero: how many transactions, and how many filters are on. */
function heroStats(total: number, activeCount: number, upcoming: number) {
	const pills = [
		{
			symbol: "receipt_long",
			label: `${total} ${total === 1 ? "transaction" : "transactions"}`,
		},
	];
	if (activeCount > 0)
		pills.push({
			symbol: "tune",
			label: `${activeCount} ${activeCount === 1 ? "filter" : "filters"}`,
		});
	if (upcoming > 0) pills.push({ symbol: "calendar_month", label: `${upcoming} upcoming` });
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
		cards,
		templates,
		allTags,
		allGroups,
		transferSuggestions,
		defaultAccountId,
		upcoming,
		currencies,
		selectedVendor,
		selectedCategory,
		allCategories,
		budget,
		selectedAccount,
		hasSalaryRules,
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
	// Set while adding a transaction that starts as a copy of an existing one.
	const [copyOf, setCopyOf] = useState<Transaction | null>(null);
	const duplicate = useCallback((t: Transaction) => {
		setCopyOf(t);
		setEditing("new");
	}, []);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const [converting, setConverting] = useState<Transaction | null>(null);
	const { refunding, refundOf, edit, close: closeRefund } = useRefundDialog(setEditing);
	const salary = useSalarySplit(hasSalaryRules);

	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	const filtered = hasAnyFilter(search);
	const filterValues = pickFilterValues(search);

	// A chip or field shows its change at once. The URL (what `filterValues` reads) only changes once
	// the page's data has loaded, so the change is held as an optimistic value for the length of the
	// navigation (`navigate` settles when the load does) and drops back to the URL's own after it,
	// or straight away if the load fails.
	const [shownFilters, showFilters] = useOptimistic(
		filterValues,
		(current, change: Partial<TransactionFilterValues>) => ({
			...current,
			...change,
		}),
	);
	const activeCount = countActiveFilters(shownFilters);
	const patch = (p: Partial<TransactionFilterValues>) =>
		startTransition(async () => {
			showFilters(p);
			await navigate({ search: (prev) => ({ ...prev, page: 1, ...p }) });
		});
	const clearAll = () =>
		startTransition(async () => {
			showFilters(pickFilterValues({}));
			await navigate({
				search: (p) => ({ page: 1, pageSize: p.pageSize, q: p.q }),
			});
		});

	const activeFilters = buildActiveFilters({
		filters: filterValues,
		selectedAccount,
		selectedCard: cardFilterLabel(cards, filterValues.card_id),
		selectedVendor,
		selectedCategory,
		tagNames: tagNamesOf(filterValues.tag_ids, allTags),
		baseCurrency: user.base_currency,
		patch,
	});

	const filterPanel = (
		<TransactionFilters
			filters={shownFilters}
			selectedAccount={selectedAccount}
			selectedVendor={selectedVendor}
			selectedCategory={selectedCategory}
			cards={cards}
			tags={allTags}
			baseCurrency={user.base_currency}
			activeCount={activeCount}
			onChange={patch}
			onClear={clearAll}
		/>
	);

	return (
		<CardMorph direction="up">
			<PageHeader
				title="Transactions"
				symbol="receipt_long"
				accent="blue"
				shape={0}
				description={`Amounts are totalled in ${user.base_currency}.`}
				stats={heroStats(total, activeCount, upcoming.length)}
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add transaction
					</Button>
				}
			/>

			<BudgetAlert budget={budget} />

			<UpcomingCard
				items={upcoming}
				baseCurrency={user.base_currency}
				onEdit={setEditing}
				onDelete={setDeleting}
			/>
			<TransferSuggestionsCard suggestions={transferSuggestions} />

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
							<TransactionTotals
								totals={totals}
								note={excludedNote(accounts, Boolean(search.account_id))}
							/>
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
									<TransactionList
										items={items}
										baseCurrency={user.base_currency}
										categories={allCategories}
										vendors={vendors}
										tags={allTags}
										groups={allGroups}
										total={total}
										search={search}
										onConvert={setConverting}
										onSplit={salary.open}
										onRefund={refundOf}
										onDuplicate={duplicate}
										onEdit={edit}
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
					seed={editing === "new" && copyOf ? seedFromTransaction(copyOf) : undefined}
					templates={templates}
					tags={allTags}
					defaultAccountId={defaultAccountId}
					vendors={vendors}
					categories={allCategories}
					subscriptions={subscriptions}
					accounts={accounts}
					cards={cards}
					currencies={currencies}
					baseCurrency={user.base_currency}
					onCreated={salary.afterCreate}
					onClose={() => {
						setEditing(null);
						setCopyOf(null);
					}}
				/>
			)}
			<SalarySplitHost id={salary.id} onClose={salary.close} />
			<RefundDialogHost
				state={refunding}
				accounts={accounts}
				baseCurrency={user.base_currency}
				onClose={closeRefund}
			/>
			{converting && (
				<MakeSubscriptionDialog transaction={converting} onClose={() => setConverting(null)} />
			)}
			{deleting && (
				<ConfirmDelete
					{...deleteCopy(deleting)}
					onConfirm={() => deleteTransactionFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</CardMorph>
	);
}
