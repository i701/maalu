import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, useCallback, useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import GroupDetailDialog from "#/components/GroupDetailDialog";
import GroupForm from "#/components/GroupForm";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import { formatMoney } from "#/lib/format";
import { dateSpan } from "#/lib/groups";
import { useLiveSearch } from "#/lib/live-search";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { deleteGroupFn, listGroupsPageFn } from "#/server/groups";
import type { TransactionGroup } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	/** A group to open straight away, from a chip on a transaction. */
	group: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/groups")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ page: search.page, pageSize: search.pageSize, q: search.q }),
	loader: async ({ deps }) => {
		const rows = unwrap(await listGroupsPageFn({ data: deps }));
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/groups", search: { ...deps, page: last } });
		return rows;
	},
	component: GroupsPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Net({ group }: { group: TransactionGroup }) {
	return (
		<Typography
			variant="body2"
			sx={{
				fontWeight: 600,
				fontVariantNumeric: "tabular-nums",
				color: Number(group.net) < 0 ? "error.main" : "text.primary",
			}}
		>
			{formatMoney(group.net, group.currency)}
		</Typography>
	);
}

function GroupName({ group, onOpen }: { group: TransactionGroup; onOpen: () => void }) {
	return (
		<Box
			component="button"
			type="button"
			onClick={onOpen}
			sx={{
				all: "unset",
				cursor: "pointer",
				display: "block",
				minWidth: 0,
				textAlign: "left",
				"&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
			}}
		>
			<Typography variant="body2" sx={{ fontWeight: 500 }}>
				{group.name}
			</Typography>
			{group.note && (
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{group.note}
				</Typography>
			)}
		</Box>
	);
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
	return (
		<>
			<IconButton aria-label="Edit" title="Edit" size="small" onClick={onEdit}>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

const GroupsTable = memo(function GroupsTable({
	items,
	onOpen,
	onEdit,
	onDelete,
}: {
	items: TransactionGroup[];
	onOpen: (row: TransactionGroup) => void;
	onEdit: (row: TransactionGroup) => void;
	onDelete: (row: TransactionGroup) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(g) => g.id}
			minWidth={620}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Transactions</TableCell>
					<TableCell>Dates</TableCell>
					<TableCell align="right">Net</TableCell>
					<TableCell align="right" sx={{ width: 110 }} />
				</TableRow>
			}
			renderRow={(g) => (
				<TableRow hover>
					<TableCell>
						<GroupName group={g} onOpen={() => onOpen(g)} />
					</TableCell>
					<TableCell>{g.transaction_count}</TableCell>
					<TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
						{dateSpan(g.date_from, g.date_to)}
					</TableCell>
					<TableCell align="right">
						<Net group={g} />
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions onEdit={() => onEdit(g)} onDelete={() => onDelete(g)} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(g) => (
				<MobileCard
					leading={
						<ShapeTile shape={3} size={52} accent={ACCENT.blue}>
							<Symbol name="inventory_2" size={24} filled />
						</ShapeTile>
					}
					primary={<GroupName group={g} onOpen={() => onOpen(g)} />}
					secondary={
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
							{dateSpan(g.date_from, g.date_to)}
						</Typography>
					}
					end={<Net group={g} />}
					endSecondary={
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{plural(g.transaction_count, "transaction", "transactions")}
						</Typography>
					}
					actions={<Actions onEdit={() => onEdit(g)} onDelete={() => onDelete(g)} />}
				/>
			)}
		/>
	);
});

function GroupsPage() {
	const { items, total } = Route.useLoaderData();
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};
	const [editing, setEditing] = useState<TransactionGroup | null>(null);
	const [deleting, setDeleting] = useState<TransactionGroup | null>(null);

	const open = useCallback(
		(g: TransactionGroup) => navigate({ search: (p) => ({ ...p, group: g.id }) }),
		[navigate],
	);
	const filtered = Boolean(search.q);
	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	return (
		<>
			<PageHeader
				title="Groups"
				symbol="inventory_2"
				accent="blue"
				shape={3}
				stats={[{ symbol: "inventory_2", label: plural(total, "group", "groups") }]}
				description="Bundle related transactions to see what they add up to. Select transactions on the Transactions page to make one."
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={plural(total, "group", "groups")}
						filters={
							<SearchField
								value={search.q ?? ""}
								placeholder="Search groups"
								onChange={(q) =>
									navigate({ search: (p) => ({ ...p, page: 1, q: q || undefined }) })
								}
							/>
						}
					/>

					{items.length === 0 ? (
						<EmptyState
							firstRun={!filtered}
							symbol={filtered ? "search" : "inventory_2"}
							accent={filtered ? "slate" : "blue"}
							shape={3}
						>
							{filtered
								? "No groups match this search."
								: "No groups yet. Select two or more transactions and choose Group, for example the costs of a trip."}
						</EmptyState>
					) : (
						<GroupsTable items={items} onOpen={open} onEdit={setEditing} onDelete={setDeleting} />
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

			{search.group && (
				<GroupDetailDialog
					key={search.group}
					groupId={search.group}
					onClose={() => navigate({ search: (p) => ({ ...p, group: undefined }), replace: true })}
				/>
			)}
			{editing && <GroupForm group={editing} onClose={() => setEditing(null)} />}
			{deleting && (
				<ConfirmDelete
					title="Delete group"
					message={`Delete "${deleting.name}"? Its ${plural(deleting.transaction_count, "transaction", "transactions")} are kept and just stop being grouped.`}
					onConfirm={() => deleteGroupFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
