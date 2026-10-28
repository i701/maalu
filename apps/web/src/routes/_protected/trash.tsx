import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import MobileCard from "#/components/MobileCard";
import { useNotify } from "#/components/Notify";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TonalChip from "#/components/TonalChip";
import { formatDate, formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { useAction } from "#/lib/use-action";
import {
	deleteTransactionPermanentlyFn,
	listTrashFn,
	restoreTransactionFn,
} from "#/server/transactions";
import { TRANSACTION_TYPE_LABELS, type Transaction } from "#/types/api";

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
				{TRANSACTION_TYPE_LABELS[t.type]} · {formatDate(t.transaction_date)}
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
	onDeleteForever,
}: {
	items: Transaction[];
	onDeleteForever: (t: Transaction) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(t) => t.id}
			minWidth={620}
			head={
				<TableRow>
					<TableCell>Transaction</TableCell>
					<TableCell align="right">Amount</TableCell>
					<TableCell>Deleted</TableCell>
					<TableCell align="right" sx={{ width: 110 }} />
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow hover>
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

function TrashPage() {
	const { items, total } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const [deleting, setDeleting] = useState<Transaction | null>(null);
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
						<TrashTable items={items} onDeleteForever={setDeleting} />
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

			{deleting && (
				<ConfirmDelete
					title="Delete forever"
					message={`Delete this ${amount(deleting)} transaction for good? This can't be undone.`}
					confirmLabel="Delete forever"
					onConfirm={() => deleteTransactionPermanentlyFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
