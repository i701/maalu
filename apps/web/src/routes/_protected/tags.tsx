import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { memo, useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import MergeTagDialog from "#/components/MergeTagDialog";
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
import TagChip from "#/components/TagChip";
import TagForm from "#/components/TagForm";
import TonalChip from "#/components/TonalChip";
import { useLiveSearch } from "#/lib/live-search";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { tagAccent } from "#/lib/tags";
import { unwrap } from "#/lib/unwrap";
import { deleteTagFn, listTagsFn, listTagsPageFn } from "#/server/tags";
import type { Tag } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/tags")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [page, all] = await Promise.all([listTagsPageFn({ data: deps }), listTagsFn()]);
		const rows = unwrap(page);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/tags", search: { ...deps, page: last } });
		return { ...rows, all: unwrap(all) };
	},
	component: TagsPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Usage({ tag }: { tag: Tag }) {
	return (
		<>
			<TonalChip
				accent={ACCENT.blue}
				label={plural(tag.transaction_count, "transaction", "transactions")}
			/>
			{tag.template_count > 0 && (
				<TonalChip
					accent={ACCENT.lime}
					label={plural(tag.template_count, "template", "templates")}
				/>
			)}
		</>
	);
}

/** Opens the transactions page filtered to this tag. */
function TagName({ tag }: { tag: Tag }) {
	return (
		<Link
			to="/transactions"
			search={{ tag_ids: [tag.id], page: 1, pageSize: 20 }}
			style={{ color: "inherit", textDecoration: "none" }}
		>
			<TagChip tag={tag} />
		</Link>
	);
}

function Actions({
	onRename,
	onMerge,
	onDelete,
}: {
	onRename: () => void;
	onMerge: () => void;
	onDelete: () => void;
}) {
	return (
		<>
			<IconButton aria-label="Rename" title="Rename" size="small" onClick={onRename}>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton aria-label="Merge into another tag" title="Merge" size="small" onClick={onMerge}>
				<Symbol name="sort" size={20} />
			</IconButton>
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

const TagsTable = memo(function TagsTable({
	items,
	onRename,
	onMerge,
	onDelete,
}: {
	items: Tag[];
	onRename: (row: Tag) => void;
	onMerge: (row: Tag) => void;
	onDelete: (row: Tag) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(t) => t.id}
			minWidth={560}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Used by</TableCell>
					<TableCell align="right" sx={{ width: 140 }} />
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow hover>
					<TableCell>
						<TagName tag={t} />
					</TableCell>
					<TableCell sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
						<Usage tag={t} />
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions
							onRename={() => onRename(t)}
							onMerge={() => onMerge(t)}
							onDelete={() => onDelete(t)}
						/>
					</TableCell>
				</TableRow>
			)}
			renderCard={(t) => (
				<MobileCard
					leading={
						<ShapeTile shape={6} size={52} accent={tagAccent(t.color)}>
							<Symbol name="sell" size={24} filled />
						</ShapeTile>
					}
					primary={<TagName tag={t} />}
					meta={<Usage tag={t} />}
					actions={
						<Actions
							onRename={() => onRename(t)}
							onMerge={() => onMerge(t)}
							onDelete={() => onDelete(t)}
						/>
					}
				/>
			)}
		/>
	);
});

function TagsPage() {
	const { items, total, all } = Route.useLoaderData();
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};
	const [editing, setEditing] = useState<Tag | "new" | null>(null);
	const [merging, setMerging] = useState<Tag | null>(null);
	const [deleting, setDeleting] = useState<Tag | null>(null);

	const filtered = Boolean(search.q);
	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	return (
		<>
			<PageHeader
				title="Tags"
				symbol="sell"
				accent="violet"
				shape={6}
				stats={[{ symbol: "sell", label: plural(total, "tag", "tags") }]}
				description="Labels that cut across categories, like Trip or Need. Put them on a transaction and filter by them."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add tag
					</Button>
				}
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={plural(total, "tag", "tags")}
						filters={
							<>
								<SearchField
									value={search.q ?? ""}
									placeholder="Search tags"
									onChange={(q) =>
										navigate({ search: (p) => ({ ...p, page: 1, q: q || undefined }) })
									}
								/>
								{filtered && (
									<Button
										color="inherit"
										onClick={() => navigate({ search: (p) => ({ page: 1, pageSize: p.pageSize }) })}
									>
										Clear filters
									</Button>
								)}
							</>
						}
					/>

					{items.length === 0 ? (
						<EmptyState
							firstRun={!filtered}
							symbol={filtered ? "search" : "sell"}
							accent={filtered ? "slate" : "violet"}
							shape={6}
						>
							{filtered
								? "No tags match this search."
								: "No tags yet. Add them in the Tags field of a transaction, or here."}
						</EmptyState>
					) : (
						<TagsTable
							items={items}
							onRename={setEditing}
							onMerge={setMerging}
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

			{editing && (
				<TagForm tag={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />
			)}
			{merging && <MergeTagDialog tag={merging} tags={all} onClose={() => setMerging(null)} />}
			{deleting && (
				<ConfirmDelete
					title="Delete tag"
					message={`Delete the "${deleting.name}" tag? It is removed from ${plural(deleting.transaction_count, "transaction", "transactions")}; nothing else changes.`}
					onConfirm={() => deleteTagFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
