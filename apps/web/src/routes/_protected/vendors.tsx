import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import MergeVendorDialog from "#/components/MergeVendorDialog";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import ChipFilter from "#/components/ChipFilter";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import { TagChips } from "#/components/TagChip";
import TonalChip from "#/components/TonalChip";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import VendorForm from "#/components/VendorForm";
import { LOCALITY_ACCENT } from "#/lib/accents";
import { ACCENT } from "#/lib/m3";
import { useLiveSearch } from "#/lib/live-search";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { listCategoriesFn } from "#/server/categories";
import { listCurrenciesFn } from "#/server/currencies";
import { listTagsFn } from "#/server/tags";
import { deleteVendorFn, listVendorsPageFn } from "#/server/vendors";
import { VENDOR_LOCALITIES, VENDOR_LOCALITY_LABELS, type Vendor } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	locality: z.enum(VENDOR_LOCALITIES).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/vendors")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [vendors, currencies, categories, tags] = await Promise.all([
			listVendorsPageFn({ data: deps }),
			listCurrenciesFn(),
			listCategoriesFn(),
			listTagsFn(),
		]);
		const rows = unwrap(vendors);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/vendors", search: { ...deps, page: last } });
		return { ...rows, currencies, categories: unwrap(categories), tags: unwrap(tags) };
	},
	component: VendorsPage,
});

const dash = (
	<Typography component="span" sx={{ color: "text.disabled" }}>
		—
	</Typography>
);

function LocalChip({ vendor }: { vendor: Vendor }) {
	if (vendor.is_local == null) return null;
	return (
		<TonalChip
			accent={vendor.is_local ? LOCALITY_ACCENT.local : LOCALITY_ACCENT.foreign}
			label={vendor.is_local ? "Local" : "Foreign"}
		/>
	);
}

function VendorActions({
	onEdit,
	onMerge,
	onDelete,
}: {
	onEdit: () => void;
	onMerge: () => void;
	onDelete: () => void;
}) {
	return (
		<>
			<IconButton aria-label="Edit" title="Edit" size="small" onClick={onEdit}>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton
				aria-label="Merge into another vendor"
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

/** The results table, memoised so it only re-renders when the loaded rows change, not on every
 * keystroke in the filter controls. */
const VendorsTable = memo(function VendorsTable({
	items,
	onEdit,
	onMerge,
	onDelete,
}: {
	items: Vendor[];
	onEdit: (row: Vendor) => void;
	onMerge: (row: Vendor) => void;
	onDelete: (row: Vendor) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(v) => v.id}
			minWidth={760}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Type</TableCell>
					<TableCell>Currency</TableCell>
					<TableCell>Contact</TableCell>
					<TableCell>Address</TableCell>
					<TableCell align="right" sx={{ width: 100 }} />
				</TableRow>
			}
			renderRow={(v) => (
				<TableRow hover>
					<TableCell>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{v.name}
						</Typography>
						<UsualFor vendor={v} />
					</TableCell>
					<TableCell>{v.is_local == null ? dash : <LocalChip vendor={v} />}</TableCell>
					<TableCell>{v.currency ?? dash}</TableCell>
					<TableCell>{v.contact ?? dash}</TableCell>
					<TableCell sx={{ maxWidth: 260 }}>
						<Typography variant="body2" noWrap>
							{v.address ?? dash}
						</Typography>
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<VendorActions
							onEdit={() => onEdit(v)}
							onMerge={() => onMerge(v)}
							onDelete={() => onDelete(v)}
						/>
					</TableCell>
				</TableRow>
			)}
			renderCard={(v) => (
				<MobileCard
					leading={
						<ShapeTile
							shape={3}
							size={52}
							accent={
								v.is_local == null
									? ACCENT.slate
									: v.is_local
										? LOCALITY_ACCENT.local
										: LOCALITY_ACCENT.foreign
							}
						>
							<Symbol name="storefront" size={24} filled />
						</ShapeTile>
					}
					primary={
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{v.name}
						</Typography>
					}
					secondary={
						v.contact && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{v.contact}
							</Typography>
						)
					}
					end={v.currency && <Chip size="small" variant="outlined" label={v.currency} />}
					meta={
						(v.is_local != null ||
							v.address ||
							v.default_category ||
							v.default_tags.length > 0) && (
							<>
								{v.is_local != null && <LocalChip vendor={v} />}
								<UsualFor vendor={v} />
								{v.address && (
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{v.address}
									</Typography>
								)}
							</>
						)
					}
					actions={
						<VendorActions
							onEdit={() => onEdit(v)}
							onMerge={() => onMerge(v)}
							onDelete={() => onDelete(v)}
						/>
					}
				/>
			)}
		/>
	);
});

/** The category and tags a transaction with this vendor usually gets, as small chips. */
function UsualFor({ vendor }: { vendor: Vendor }) {
	if (!vendor.default_category && vendor.default_tags.length === 0) return null;
	return (
		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
			{vendor.default_category && (
				<TonalChip accent={ACCENT.pink} label={vendor.default_category} />
			)}
			<TagChips tags={vendor.default_tags} />
		</Box>
	);
}

/** The Local / Foreign / Not set filter chips. */
const LOCALITY_OPTIONS = VENDOR_LOCALITIES.map((v) => ({
	value: v,
	label: VENDOR_LOCALITY_LABELS[v],
	accent:
		v === "local" ? LOCALITY_ACCENT.local : v === "foreign" ? LOCALITY_ACCENT.foreign : undefined,
}));

/** The row above the table: locality chips, search, and a way to clear them. */
function VendorToolbar({ total }: { total: number }) {
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const filtered = Boolean(search.q || search.locality);
	return (
		<TableToolbar
			chips={
				<ChipFilter
					allLabel="All types"
					value={search.locality}
					options={LOCALITY_OPTIONS}
					onChange={(locality) => navigate({ search: (p) => ({ ...p, page: 1, locality }) })}
				/>
			}
			summary={`${total} ${total === 1 ? "vendor" : "vendors"}`}
			filters={
				<>
					<SearchField
						value={search.q ?? ""}
						placeholder="Search name, contact, address"
						onChange={(q) =>
							navigate({
								search: (p) => ({ ...p, page: 1, q: q || undefined }),
							})
						}
					/>
					{filtered && (
						<Button
							color="inherit"
							onClick={() =>
								navigate({
									search: (p) => ({ page: 1, pageSize: p.pageSize }),
								})
							}
						>
							Clear filters
						</Button>
					)}
				</>
			}
		/>
	);
}

function VendorsPage() {
	const { items, total, currencies, categories, tags } = Route.useLoaderData();
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
	const [editing, setEditing] = useState<Vendor | "new" | null>(null);
	const [merging, setMerging] = useState<Vendor | null>(null);
	const [deleting, setDeleting] = useState<Vendor | null>(null);

	const filtered = Boolean(search.q || search.locality);

	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	return (
		<>
			<PageHeader
				title="Vendors"
				symbol="storefront"
				accent="orange"
				shape={3}
				stats={[{ symbol: "storefront", label: `${total} ${total === 1 ? "vendor" : "vendors"}` }]}
				description="Shops, people and companies you pay."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add vendor
					</Button>
				}
			/>

			<PendingOverlay>
				<TableCard>
					<VendorToolbar total={total} />

					{items.length === 0 ? (
						<EmptyState
							firstRun={!filtered}
							symbol={filtered ? "search" : "storefront"}
							accent={filtered ? "slate" : "orange"}
							shape={3}
						>
							{filtered
								? "No vendors match these filters."
								: "No vendors yet. They're also created automatically when you name one on a transaction."}
						</EmptyState>
					) : (
						<VendorsTable
							items={items}
							onEdit={setEditing}
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
				<VendorForm
					vendor={editing === "new" ? undefined : editing}
					currencies={currencies}
					categories={categories}
					tags={tags}
					onClose={() => setEditing(null)}
				/>
			)}
			{merging && <MergeVendorDialog vendor={merging} onClose={() => setMerging(null)} />}
			{deleting && (
				<ConfirmDelete
					title="Delete vendor"
					message={`Delete "${deleting.name}"? Its transactions are kept and just lose the vendor link.`}
					onConfirm={() => deleteVendorFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
