import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import InsertLinkOutlinedIcon from "@mui/icons-material/InsertLinkOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { memo, useCallback, useMemo, useState } from "react";
import { z } from "zod";
import ActiveFilters from "#/components/ActiveFilters";
import BulkEditDialog from "#/components/BulkEditDialog";
import GroupDialog from "#/components/GroupDialog";
import ConfirmDelete from "#/components/ConfirmDelete";
import MakeTransferDialog from "#/components/MakeTransferDialog";
import EmptyState from "#/components/EmptyState";
import ExportButton from "#/components/ExportButton";
import FiltersDrawer from "#/components/FiltersDrawer";
import MakeSubscriptionDialog from "#/components/MakeSubscriptionDialog";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import SelectAllMatching from "#/components/SelectAllMatching";
import SelectionBar from "#/components/SelectionBar";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import { TagChips } from "#/components/TagChip";
import { excludedNote } from "#/lib/accounts";
import { txSubtitle, txTitle } from "#/lib/tx-display";
import CategoryDot from "#/components/CategoryDot";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import TonalChip from "#/components/TonalChip";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TransactionFilters from "#/components/TransactionFilters";
import TransactionForm from "#/components/TransactionForm";
import { seedFromTransaction } from "#/components/transaction-form/request";
import TransactionTotals from "#/components/TransactionTotals";
import BudgetAlert from "#/components/BudgetAlert";
import TransferSuggestionsCard from "#/components/TransferSuggestionsCard";
import UpcomingCard from "#/components/UpcomingCard";
import CategoryBreakdown from "#/components/CategoryBreakdown";
import { formatDate, formatMoney, formatTime, formatWhen } from "#/lib/format";
import { PAYMENT_ACCENT, TRANSFER_ACCENT } from "#/lib/accents";
import { ACCENT } from "#/lib/m3";
import { useLiveSearch } from "#/lib/live-search";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import {
	buildActiveFilters,
	tagNamesOf,
	countActiveFilters,
	hasAnyFilter,
	pickFilterValues,
	type TransactionFilterValues,
	type TransactionSearch,
} from "#/lib/transaction-filters";
import { transactionCount } from "#/lib/bulk-message";
import { type SelectionState, useSelection } from "#/lib/selection";
import { unwrap } from "#/lib/unwrap";
import { getAccountFn, listAccountsFn } from "#/server/accounts";
import { listCardsFn } from "#/server/cards";
import { cardFilterLabel } from "#/lib/cards";
import { listCurrenciesFn } from "#/server/currencies";
import { listSubscriptionsFn } from "#/server/subscriptions";
import { listSalaryRulesFn } from "#/server/salary";
import { listTemplatesFn } from "#/server/templates";
import { canSplitSalary, useSalarySplit } from "#/lib/use-salary-split";
import SalarySplitHost from "#/components/SalarySplitHost";
import {
	listUpcomingFn,
	listTransferSuggestionsFn,
	bulkTrashFn,
	deleteTransactionFn,
	getCategoryTotalsFn,
	getTransactionTotalsFn,
	listMatchingIdsFn,
	listTransactionsFn,
} from "#/server/transactions";
import { getBudgetFn } from "#/server/budget";
import { getCategoryFn, listCategoriesFn } from "#/server/categories";
import { listGroupsFn } from "#/server/groups";
import { getMeFn } from "#/server/auth";
import RefundDialogHost from "#/components/RefundDialogHost";
import { placeLabel } from "#/lib/places";
import { linkablePair } from "#/lib/transfer-link";
import { canLinkRefund, canRefund, isRefund, wasRefunded } from "#/lib/refund";
import { useRefundDialog } from "#/lib/use-refund-dialog";
import { listTagsFn } from "#/server/tags";
import { getVendorFn, listVendorsFn } from "#/server/vendors";
import {
	ACCOUNT_GROUP_LABELS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	TRANSACTION_TYPES,
	type Category,
	type Tag,
	type TransactionGroup,
	type Transaction,
	type Vendor,
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
			listUpcomingFn(),
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

function TxSubtitle({ t }: { t: Transaction }) {
	const dot = t.type !== "transfer" && t.splits.length <= 1 && t.category_color;
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
			{dot && <CategoryDot color={dot} size={8} />}
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{txSubtitle(t)}
			</Typography>
			{t.attachment_count + t.link_count > 0 && (
				<Box
					component="span"
					title={`${t.attachment_count + t.link_count} attached`}
					sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary" }}
				>
					<AttachFileIcon sx={{ fontSize: 14 }} />
				</Box>
			)}
		</Box>
	);
}

function TxTile({ t }: { t: Transaction }) {
	const k = isRefund(t) ? REFUND_TILE : TYPE_TILE[t.type];
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

/** "Adjustment" on a balance correction, and a note when the account is left out of the totals:
 * neither counts as income or spending. */
function TxStatsChips({ t }: { t: Transaction }) {
	return (
		<>
			{t.adjustment && (
				<TonalChip
					accent={ACCENT.slate}
					label="Adjustment"
					title="A correction that makes the account match its bank: not income or spending"
				/>
			)}
			{t.latitude != null && (
				<TonalChip accent={ACCENT.pink} label={placeLabel(t)} title="Marked on the map" />
			)}
			{t.account?.exclude_from_stats && (
				<TonalChip
					accent={ACCENT.slate}
					label="Not in my totals"
					title="This account is left out of your totals and reports"
				/>
			)}
		</>
	);
}

/** "Refund" on money given back, and how much of a purchase has been refunded. */
function TxRefundChip({ t }: { t: Transaction }) {
	if (isRefund(t)) return <TonalChip accent={ACCENT.green} label="Refund" />;
	if (!wasRefunded(t)) return null;
	return (
		<TonalChip
			accent={ACCENT.amber}
			label={
				canRefund(t) ? `Refunded ${formatMoney(t.refunded_amount, t.currency)}` : "Fully refunded"
			}
		/>
	);
}

/** The group it belongs to, opening that group. */
function TxGroupChip({ t }: { t: Transaction }) {
	if (!t.group) return null;
	return (
		<Link
			to="/groups"
			search={{ group: t.group.id, page: 1, pageSize: 20 }}
			style={{ textDecoration: "none" }}
			title={`Open the group "${t.group.name}"`}
		>
			<TonalChip accent={ACCENT.blue} label={t.group.name} clickable />
		</Link>
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
	onSplit,
	onRefund,
	onDuplicate,
	onEdit,
	onDelete,
}: {
	t: Transaction;
	onConvert: () => void;
	onSplit: () => void;
	onRefund: () => void;
	onDuplicate: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	if (t.adjustment)
		return (
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		);
	return (
		<>
			{canRefund(t) && (
				<IconButton aria-label="Refund" title="Refund" size="small" onClick={onRefund}>
					<UndoIcon fontSize="small" />
				</IconButton>
			)}
			{canLinkRefund(t) && (
				<IconButton
					aria-label="Link to a purchase"
					title="This is a refund: link it to the purchase"
					size="small"
					onClick={onRefund}
				>
					<InsertLinkOutlinedIcon fontSize="small" />
				</IconButton>
			)}
			{canSplitSalary(t) && (
				<IconButton
					aria-label="Split salary"
					title="Split this salary between accounts and goals"
					size="small"
					onClick={onSplit}
				>
					<CallSplitIcon fontSize="small" />
				</IconButton>
			)}
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
			{!isRefund(t) && (
				<IconButton aria-label="Duplicate" title="Duplicate" size="small" onClick={onDuplicate}>
					<ContentCopyOutlinedIcon fontSize="small" />
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
	selected,
	selectionState,
	onToggle,
	onToggleAll,
	baseCurrency,
	onConvert,
	onSplit,
	onRefund,
	onDuplicate,
	onEdit,
	onDelete,
}: {
	items: Transaction[];
	selected: ReadonlySet<string>;
	selectionState: SelectionState;
	onToggle: (id: string) => void;
	onToggleAll: () => void;
	baseCurrency: string;
	onConvert: (t: Transaction) => void;
	onSplit: (t: Transaction) => void;
	onRefund: (t: Transaction) => void;
	onDuplicate: (t: Transaction) => void;
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
					<TableCell padding="checkbox">
						<Checkbox
							size="small"
							checked={selectionState === "all"}
							indeterminate={selectionState === "some"}
							onChange={onToggleAll}
							slotProps={{ input: { "aria-label": "Select all transactions on this page" } }}
						/>
					</TableCell>
					<TableCell>Date</TableCell>
					<TableCell>Details</TableCell>
					<TableCell>Method</TableCell>
					<TableCell align="right">Amount</TableCell>
					<TableCell align="right" sx={{ width: 100 }} />
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow hover selected={selected.has(t.id)}>
					<TableCell padding="checkbox">
						<Checkbox
							size="small"
							checked={selected.has(t.id)}
							onChange={() => onToggle(t.id)}
							slotProps={{ input: { "aria-label": `Select ${txTitle(t)}` } }}
						/>
					</TableCell>
					<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
						{formatDate(t.transaction_date)}
						{t.transaction_time && (
							<Typography variant="caption" sx={{ display: "block" }}>
								{formatTime(t.transaction_time)}
							</Typography>
						)}
					</TableCell>
					<TableCell>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{txTitle(t)}
						</Typography>
						<TxSubtitle t={t} />
						{t.subscription && (
							<Box sx={{ mt: 0.5 }}>
								<TxSubscriptionChip t={t} />
							</Box>
						)}
						{(isRefund(t) || wasRefunded(t)) && (
							<Box sx={{ mt: 0.5 }}>
								<TxRefundChip t={t} />
							</Box>
						)}
						{t.group && (
							<Box sx={{ mt: 0.5 }}>
								<TxGroupChip t={t} />
							</Box>
						)}
						{(t.adjustment || t.account?.exclude_from_stats) && (
							<Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
								<TxStatsChips t={t} />
							</Box>
						)}
						{t.tags.length > 0 && (
							<Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
								<TagChips tags={t.tags} />
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
							onSplit={() => onSplit(t)}
							onRefund={() => onRefund(t)}
							onDuplicate={() => onDuplicate(t)}
							onEdit={() => onEdit(t)}
							onDelete={() => onDelete(t)}
						/>
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
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{txTitle(t)}
						</Typography>
					}
					secondary={
						(txSubtitle(t) || t.attachment_count + t.link_count > 0) && <TxSubtitle t={t} />
					}
					end={<TxAmount t={t} baseCurrency={baseCurrency} />}
					endSecondary={
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
							{formatWhen(t.transaction_date, t.transaction_time)}
						</Typography>
					}
					brief={
						<>
							{t.type !== "transfer" && t.account && (
								<Typography variant="caption" noWrap sx={{ color: "text.secondary", minWidth: 0 }}>
									{t.account.name}
								</Typography>
							)}
							<TagChips tags={t.tags} />
						</>
					}
					meta={
						<>
							<TxMethodChip t={t} />
							{t.type !== "transfer" && t.account && (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{t.account.name}
								</Typography>
							)}
							<TxSubscriptionChip t={t} />
							<TxRefundChip t={t} />
							<TxGroupChip t={t} />
							<TxStatsChips t={t} />
							<TagChips tags={t.tags} />
						</>
					}
					actions={
						<TxActions
							t={t}
							onConvert={() => onConvert(t)}
							onSplit={() => onSplit(t)}
							onRefund={() => onRefund(t)}
							onDuplicate={() => onDuplicate(t)}
							onEdit={() => onEdit(t)}
							onDelete={() => onDelete(t)}
						/>
					}
				/>
			)}
		/>
	);
});

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
						load={() => listMatchingIdsFn({ data: { ...pickFilterValues(search), q: search.q } })}
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
		{ symbol: "receipt_long", label: `${total} ${total === 1 ? "transaction" : "transactions"}` },
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
	const activeCount = countActiveFilters(search);

	const patch = (p: Partial<TransactionFilterValues>) =>
		navigate({ search: (prev) => ({ ...prev, page: 1, ...p }) });
	const clearAll = () => navigate({ search: (p) => ({ page: 1, pageSize: p.pageSize, q: p.q }) });

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
			filters={filterValues}
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
		<>
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
		</>
	);
}
