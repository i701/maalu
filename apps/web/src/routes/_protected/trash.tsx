import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, useCallback, useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import MobileCard from "#/components/MobileCard";
import { useNotify } from "#/components/Notify";
import PageHeader from "#/components/PageHeader";
import SelectionBar from "#/components/SelectionBar";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TonalChip from "#/components/TonalChip";
import { bulkMessage, transactionCount } from "#/lib/bulk-message";
import { formatDate, formatMoney, formatWhen } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { type SelectionState, useSelection } from "#/lib/selection";
import { unwrap } from "#/lib/unwrap";
import { useAction } from "#/lib/use-action";
import {
	bulkPurgeFn,
	bulkRestoreFn,
	listTrashFn,
	restoreTransactionFn,
} from "#/server/transactions";
import { TRANSACTION_TYPE_LABELS, type BulkResult, type Transaction } from "#/types/api";

const searchSchema = z.object(pageSearch);

export const Route = createFileRoute("/_protected/trash")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const rows = unwrap(await listTrashFn({ data: deps }));
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was restored: land on the last page that has rows
		if (last) throw redirect({ to: "/trash", search: { ...deps, page: last } });
		return rows;
	},
	component: TrashPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const title = (t: Transaction) =>
	t.type === "transfer" ? "Transfer" : (t.description ?? t.vendor?.name ?? t.category);

function Summary({ transaction: t }: { transaction: Transaction }) {
	return (
		<>
			<Typography variant="body2" sx={{ fontWeight: 500 }}>
				{title(t)}
			</Typography>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{TRANSACTION_TYPE_LABELS[t.type]} · {formatWhen(t.transaction_date, t.transaction_time)}
			</Typography>
		</>
	);
}

const amount = (t: Transaction) => formatMoney(t.amount, t.currency);

function Actions({
	transaction,
	onDeleteForever,
}: {
	transaction: Transaction;
	onDeleteForever: (t: Transaction) => void;
}) {
	const { run, pending } = useAction();
	const notify = useNotify();
	return (
		<>
			<IconButton
				aria-label="Restore"
				title="Restore"
				size="small"
				disabled={pending}
				onClick={async () => {
					if (await run(() => restoreTransactionFn({ data: { id: transaction.id } })))
						notify("Restored");
				}}
			>
				<RestoreFromTrashOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton
				aria-label="Delete forever"
				title="Delete forever"
				size="small"
				onClick={() => onDeleteForever(transaction)}
			>
				<DeleteForeverOutlinedIcon fontSize="small" />
			</IconButton>
		</>
	);
}

const TrashTable = memo(function TrashTable({
	items,
	selected,
	selectionState,
	onToggle,
	onToggleAll,
	onDeleteForever,
}: {
	items: Transaction[];
	selected: ReadonlySet<string>;
	selectionState: SelectionState;
	onToggle: (id: string) => void;
	onToggleAll: () => void;
	onDeleteForever: (t: Transaction) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(t) => t.id}
			minWidth={620}
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
					<TableCell>Transaction</TableCell>
					<TableCell align="right">Amount</TableCell>
					<TableCell>Deleted</TableCell>
					<TableCell align="right" sx={{ width: 110 }} />
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow hover selected={selected.has(t.id)}>
					<TableCell padding="checkbox">
						<Checkbox
							size="small"
							checked={selected.has(t.id)}
							onChange={() => onToggle(t.id)}
							slotProps={{ input: { "aria-label": `Select ${title(t)}` } }}
						/>
					</TableCell>
					<TableCell>
						<Summary transaction={t} />
					</TableCell>
					<TableCell align="right">{amount(t)}</TableCell>
					<TableCell>{t.deleted_at ? formatDate(t.deleted_at.slice(0, 10)) : ""}</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions transaction={t} onDeleteForever={onDeleteForever} />
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
							slotProps={{ input: { "aria-label": `Select ${title(t)}` } }}
							sx={{ ml: -0.75, mt: 0.5, alignSelf: "flex-start" }}
						/>
					}
					leading={
						<ShapeTile shape={4} size={52} accent={ACCENT.slate}>
							<Symbol name="receipt_long" size={24} filled />
						</ShapeTile>
					}
					primary={<Summary transaction={t} />}
					end={<Typography variant="body2">{amount(t)}</Typography>}
					meta={
						t.deleted_at && (
							<TonalChip
								accent={ACCENT.slate}
								label={`Deleted ${formatDate(t.deleted_at.slice(0, 10))}`}
							/>
						)
					}
					actions={<Actions transaction={t} onDeleteForever={onDeleteForever} />}
				/>
			)}
		/>
	);
});

/** The trash table with row selection: restore or delete for good, one row or many. */
function TrashList({ items }: { items: Transaction[] }) {
	const selection = useSelection(items.map((t) => t.id));
	const { run, pending } = useAction();
	const notify = useNotify();
	// The ids the open dialog is about, fixed when it opened (the selection resets once rows move).
	const [deleting, setDeleting] = useState<string[] | null>(null);
	const deleteOne = useCallback((t: Transaction) => setDeleting([t.id]), []);

	async function restoreSelected() {
		const ids = selection.selectedIds;
		let result: BulkResult | undefined;
		const ok = await run(async () => {
			const res = await bulkRestoreFn({ data: { ids } });
			if (res.ok) result = res.data;
			return res;
		});
		if (ok && result) {
			const message = bulkMessage((n) => `Restored ${transactionCount(n)}`, result);
			notify(message.text, message.severity);
			selection.clear();
		}
	}

	return (
		<>
			<SelectionBar count={selection.selectedIds.length} onClear={selection.clear}>
				<Button
					size="small"
					color="inherit"
					startIcon={<RestoreFromTrashOutlinedIcon />}
					loading={pending}
					onClick={restoreSelected}
				>
					Restore
				</Button>
				<Button
					size="small"
					color="inherit"
					startIcon={<DeleteForeverOutlinedIcon />}
					onClick={() => setDeleting(selection.selectedIds)}
				>
					Delete forever
				</Button>
			</SelectionBar>
			<TrashTable
				items={items}
				selected={selection.selected}
				selectionState={selection.state}
				onToggle={selection.toggle}
				onToggleAll={selection.toggleAll}
				onDeleteForever={deleteOne}
			/>
			{deleting && (
				<ConfirmDelete
					title="Delete forever"
					message={`Delete ${transactionCount(deleting.length)} for good? This can't be undone.`}
					confirmLabel="Delete forever"
					doneMessage={`Deleted ${transactionCount(deleting.length)} for good`}
					onConfirm={async () => {
						const res = await bulkPurgeFn({ data: { ids: deleting } });
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

function TrashPage() {
	const { items, total } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};

	return (
		<>
			<PageHeader
				title="Trash"
				symbol="delete"
				accent="slate"
				shape={4}
				stats={[{ symbol: "receipt_long", label: plural(total, "transaction", "transactions") }]}
				description="Deleted transactions wait here. They count toward nothing until you restore them."
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar summary={plural(total, "transaction", "transactions")} viewToggle={false} />

					{items.length === 0 ? (
						<EmptyState firstRun symbol="delete" accent="slate" shape={4}>
							The trash is empty. A transaction you delete lands here first, so you can get it back.
						</EmptyState>
					) : (
						<TrashList items={items} />
					)}

					<TablePager
						onPrefetch={prefetchPage}
						total={total}
						page={search.page}
						pageSize={search.pageSize}
						onPageChange={(page) => navigate({ search: (p) => ({ ...p, page }), replace: true })}
						onPageSizeChange={(pageSize) =>
							navigate({ search: (p) => ({ ...p, page: 1, pageSize }) })
						}
					/>
				</TableCard>
			</PendingOverlay>
		</>
	);
}
