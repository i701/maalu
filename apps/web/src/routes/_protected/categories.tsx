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
import CategorySpent from "#/components/CategorySpent";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import LimitRing from "#/components/LimitRing";
import MergeCategoryDialog from "#/components/MergeCategoryDialog";
import SortKindsDialog from "#/components/SortKindsDialog";
import MobileCard from "#/components/MobileCard";
import MonthPicker from "#/components/MonthPicker";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import ShapeTile from "#/components/ShapeTile";
import IconSymbol from "#/components/Symbol";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TonalChip from "#/components/TonalChip";
import { useLiveSearch } from "#/lib/live-search";
import { addDays, limitColor, limitFor, limitsOnShow } from "#/lib/budget";
import { categoryAccent, type CategorySpend, spendByCategory } from "#/lib/categories";
import { monthBounds, monthLabel } from "#/lib/dashboard";
import { formatMoney, sumDecimals } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { deleteCategoryFn, listCategoriesFn, listCategoriesPageFn } from "#/server/categories";
import { kindShares, unsortedCategories } from "#/lib/needs-wants";
import { localToday } from "#/lib/planned";
import { getBudgetFn } from "#/server/budget";
import { getCategoryTotalsFn } from "#/server/transactions";
import { type Budget, CATEGORY_KIND_LABELS, type Category } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	// Any day in the month whose spending is shown; leave it out for the current month.
	on: z.iso.date().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/categories")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const month = monthBounds(deps.on ?? localToday());
		const [page, all, totals, budget] = await Promise.all([
			listCategoriesPageFn({ data: deps }),
			listCategoriesFn(),
			// what each category spent that month; the page works without it
			getCategoryTotalsFn({ data: { date_from: month.start, date_to: month.end } }),
			// the limits for that month, for the ring on a category a limit covers; works without them
			getBudgetFn({ data: { on: deps.on ? addDays(month.start, 14) : undefined } }),
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
		return {
			...rows,
			all: unwrap(all),
			month,
			totals: totals.ok ? totals.data : null,
			budget: budget.ok ? budget.data : null,
		};
	},
	component: CategoriesPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Usage({ category }: { category: Category }) {
	const kind = category.effective_kind;
	return (
		<>
			{category.is_salary && <TonalChip accent={ACCENT.green} label="Default · pay" />}
			{kind && (
				<TonalChip
					accent={kind === "need" ? ACCENT.blue : ACCENT.orange}
					label={CATEGORY_KIND_LABELS[kind]}
					title={category.kind ? undefined : `From ${category.parent}`}
					sx={category.kind ? undefined : { opacity: 0.75 }}
				/>
			)}
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
	locked,
	onRename,
	onMerge,
	onDelete,
}: {
	/** The default Salary category: it can be edited, but not merged away or deleted */
	locked: boolean;
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
				title={locked ? "The default Salary category can't be merged away" : "Merge"}
				size="small"
				disabled={locked}
				onClick={onMerge}
			>
				<IconSymbol name="sort" size={20} />
			</IconButton>
			<IconButton
				aria-label="Delete"
				title={locked ? "The default Salary category can't be deleted" : "Delete"}
				size="small"
				disabled={locked}
				onClick={onDelete}
			>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

/** The ring for the limit a category counts against, or nothing when none covers it. */
function CategoryLimit({
	category,
	budget,
	currency,
	range,
}: {
	category: Category;
	budget: Budget | null;
	currency: string;
	/** The calendar month shown */
	range: { start: string; end: string };
}) {
	const limit = budget ? limitFor(budget, category) : null;
	if (!budget || !limit) return null;
	// a budget period that starts mid-month is not the month beside it: say which one the ring is for
	const differs = budget.period.start !== range.start || budget.period.end !== range.end;
	return (
		<LimitRing
			limit={limit}
			color={limitColor(budget, limit)}
			currency={currency}
			period={differs ? budget.period : undefined}
		/>
	);
}

/** The same on a phone, as a tag: "Groceries limit 85%" in the limit's colour. */
function LimitChip({ category, budget }: { category: Category; budget: Budget | null }) {
	const limit = budget ? limitFor(budget, category) : null;
	return budget && limit ? (
		<TonalChip accent={limitColor(budget, limit)} label={`${limit.name} limit ${limit.percent}%`} />
	) : null;
}

const CategoriesTable = memo(function CategoriesTable({
	items,
	spend,
	currency,
	range,
	budget,
	onRename,
	onMerge,
	onDelete,
}: {
	items: Category[];
	/** Spending by category id for the month shown; null when it could not be loaded */
	spend: Map<string, CategorySpend> | null;
	currency: string;
	range: { start: string; end: string };
	/** The limits for that month, null when they could not be loaded */
	budget: Budget | null;
	onRename: (row: Category) => void;
	onMerge: (row: Category) => void;
	onDelete: (row: Category) => void;
}) {
	// a Limit column only when some limit is running, so a page with no budget has no empty column
	const showLimits = budget !== null && limitsOnShow(budget).length > 0;
	return (
		<ResponsiveTable
			rows={items}
			getKey={(c) => c.id}
			minWidth={560}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Used by</TableCell>
					{spend && <TableCell align="right">Spent</TableCell>}
					{showLimits && <TableCell align="center">Limit</TableCell>}
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
					{spend && (
						<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
							<CategorySpent
								category={c}
								spend={spend.get(c.id)}
								currency={currency}
								range={range}
							/>
						</TableCell>
					)}
					{showLimits && (
						<TableCell align="center">
							<CategoryLimit category={c} budget={budget} currency={currency} range={range} />
						</TableCell>
					)}
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions
							locked={c.is_salary}
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
							<IconSymbol name="category" size={24} filled />
						</ShapeTile>
					}
					primary={<CategoryName category={c} />}
					meta={
						<>
							{spend && Number(spend.get(c.id)?.withChildren ?? 0) !== 0 && (
								<TonalChip
									accent={ACCENT.pink}
									label={`${formatMoney(spend.get(c.id)?.withChildren ?? "0", currency)} spent`}
								/>
							)}
							<LimitChip category={c} budget={budget} />
							<Usage category={c} />
						</>
					}
					actions={
						<Actions
							locked={c.is_salary}
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

function HeaderActions({
	unsorted,
	canSort,
	onSort,
	onAdd,
}: {
	unsorted: number;
	canSort: boolean;
	onSort: () => void;
	onAdd: () => void;
}) {
	return (
		<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
			{canSort && (
				<Button variant="contained" onClick={onSort}>
					{unsorted > 0 ? `Needs and wants (${unsorted} not sorted)` : "Needs and wants"}
				</Button>
			)}
			<Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
				Add category
			</Button>
		</Box>
	);
}

function CategoriesPage() {
	const { items, total, all, month, totals, budget } = Route.useLoaderData();
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
	const [sorting, setSorting] = useState(false);
	const unsorted = unsortedCategories(all).length;
	const spend = totals ? spendByCategory(totals.categories) : null;
	const currency = totals?.currency ?? "";
	const isCurrentMonth = month.start === monthBounds(localToday()).start;
	const goToMonth = (on: string | undefined) =>
		navigate({ search: (p) => ({ ...p, page: 1, on }), replace: true });
	const stats = [{ symbol: "category", label: plural(total, "category", "categories") }];
	if (totals) {
		const spent = sumDecimals(
			totals.categories.filter((c) => c.type === "expense").map((c) => c.total),
		);
		if (Number(spent) > 0) {
			stats.push({
				symbol: "category",
				label: `${formatMoney(spent, currency)} spent in ${monthLabel(month.start)}`,
			});
			const notSorted = kindShares(totals.categories)?.find((s) => s.kind === "unsorted");
			if (notSorted && notSorted.share > 0)
				stats.push({
					symbol: "category",
					label: `${Math.round(notSorted.share * 100)}% not sorted`,
				});
		}
	}

	const filtered = Boolean(search.q);
	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	return (
		<>
			<PageHeader
				title="Categories"
				symbol="category"
				accent="pink"
				shape={5}
				stats={stats}
				description="What your money is for. Rename or merge them to keep things tidy."
				action={
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
						<MonthPicker month={month.start} isCurrent={isCurrentMonth} onChange={goToMonth} />
						<HeaderActions
							unsorted={unsorted}
							canSort={all.some((c) => !c.is_salary)}
							onSort={() => setSorting(true)}
							onAdd={() => setEditing("new")}
						/>
					</Box>
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
							spend={spend}
							currency={currency}
							range={{ start: month.start, end: month.end }}
							budget={budget}
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
			{sorting && <SortKindsDialog categories={all} onClose={() => setSorting(false)} />}
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
