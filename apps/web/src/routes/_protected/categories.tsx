import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { memo, useState } from "react";
import { z } from "zod";
import CategoryDot from "#/components/CategoryDot";
import CategoryForm from "#/components/CategoryForm";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import MergeCategoryDialog from "#/components/MergeCategoryDialog";
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
import TonalChip from "#/components/TonalChip";
import { useLiveSearch } from "#/lib/live-search";
import { categoryAccent } from "#/lib/categories";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { deleteCategoryFn, listCategoriesFn, listCategoriesPageFn } from "#/server/categories";
import type { Category } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/categories")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [page, all] = await Promise.all([
			listCategoriesPageFn({ data: deps }),
			listCategoriesFn(),
		]);
		const rows = unwrap(page);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/categories", search: { ...deps, page: last } });
		return { ...rows, all: unwrap(all) };
	},
	component: CategoriesPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Usage({ category }: { category: Category }) {
	return (
		<>
			<TonalChip
				accent={ACCENT.blue}
				label={plural(category.transaction_count, "transaction", "transactions")}
			/>
			{category.child_count > 0 && (
				<TonalChip
					accent={ACCENT.green}
					label={plural(category.child_count, "sub-category", "sub-categories")}
				/>
			)}
			{category.subscription_count > 0 && (
				<TonalChip
					accent={ACCENT.violet}
					label={plural(category.subscription_count, "subscription", "subscriptions")}
				/>
			)}
		</>
	);
}

/** Opens the transactions page filtered to this category. */
function CategoryName({ category }: { category: Category }) {
	return (
		<Link
			to="/transactions"
			search={{ category_id: category.id, page: 1, pageSize: 20 }}
			style={{ color: "inherit", textDecoration: "none" }}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: category.parent_id ? 3 : 0 }}>
				<CategoryDot color={category.color} />
				<Typography variant="body2" sx={{ fontWeight: 500 }}>
					{category.name}
				</Typography>
			</Box>
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
			<IconButton aria-label="Edit" title="Edit" size="small" onClick={onRename}>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton
				aria-label="Merge into another category"
				title="Merge"
				size="small"
				onClick={onMerge}
			>
				<Symbol name="sort" size={20} />
			</IconButton>
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

const CategoriesTable = memo(function CategoriesTable({
	items,
	onRename,
	onMerge,
	onDelete,
}: {
	items: Category[];
	onRename: (row: Category) => void;
	onMerge: (row: Category) => void;
	onDelete: (row: Category) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(c) => c.id}
			minWidth={560}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Used by</TableCell>
					<TableCell align="right" sx={{ width: 140 }} />
				</TableRow>
			}
			renderRow={(c) => (
				<TableRow hover>
					<TableCell>
						<CategoryName category={c} />
					</TableCell>
					<TableCell>
						<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
							<Usage category={c} />
						</Box>
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions
							onRename={() => onRename(c)}
							onMerge={() => onMerge(c)}
							onDelete={() => onDelete(c)}
						/>
					</TableCell>
				</TableRow>
			)}
			renderCard={(c) => (
				<MobileCard
					leading={
						<ShapeTile shape={5} size={52} accent={categoryAccent(c.color)}>
							<Symbol name="category" size={24} filled />
						</ShapeTile>
					}
					primary={<CategoryName category={c} />}
					meta={<Usage category={c} />}
					actions={
						<Actions
							onRename={() => onRename(c)}
							onMerge={() => onMerge(c)}
							onDelete={() => onDelete(c)}
						/>
					}
				/>
			)}
		/>
	);
});

function CategoriesPage() {
	const { items, total, all } = Route.useLoaderData();
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};
	const [editing, setEditing] = useState<Category | "new" | null>(null);
	const [merging, setMerging] = useState<Category | null>(null);
	const [deleting, setDeleting] = useState<Category | null>(null);

	const filtered = Boolean(search.q);
	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	return (
		<>
			<PageHeader
				title="Categories"
				symbol="category"
				accent="pink"
				shape={5}
				stats={[{ symbol: "category", label: plural(total, "category", "categories") }]}
				description="What your money is for. Rename or merge them to keep things tidy."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add category
					</Button>
				}
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={plural(total, "category", "categories")}
						filters={
							<>
								<SearchField
									value={search.q ?? ""}
									placeholder="Search categories"
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
							symbol={filtered ? "search" : "category"}
							accent={filtered ? "slate" : "pink"}
							shape={5}
						>
							{filtered
								? "No categories match this search."
								: "No categories yet. They're created as you type them on a transaction."}
						</EmptyState>
					) : (
						<CategoriesTable
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
				<CategoryForm
					category={editing === "new" ? undefined : editing}
					categories={all}
					onClose={() => setEditing(null)}
				/>
			)}
			{merging && (
				<MergeCategoryDialog category={merging} categories={all} onClose={() => setMerging(null)} />
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete category"
					message={`Delete "${deleting.name}"? A category that is still used can't be deleted: merge it into another one instead.`}
					onConfirm={() => deleteCategoryFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
