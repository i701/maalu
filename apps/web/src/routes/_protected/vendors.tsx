import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import MobileCard from "#/components/MobileCard";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import VendorForm from "#/components/VendorForm";
import { useLiveSearch } from "#/lib/live-search";
import { pageSearch, useClampPage } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { listCurrenciesFn } from "#/server/currencies";
import { deleteVendorFn, listVendorsPageFn } from "#/server/vendors";
import {
	VENDOR_LOCALITIES,
	VENDOR_LOCALITY_LABELS,
	type Vendor,
	type VendorLocality,
} from "#/types/api";

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
		const [vendors, currencies] = await Promise.all([
			listVendorsPageFn({ data: deps }),
			listCurrenciesFn(),
		]);
		return { ...unwrap(vendors), currencies };
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
		<Chip
			size="small"
			color={vendor.is_local ? "success" : "warning"}
			label={vendor.is_local ? "Local" : "Foreign"}
		/>
	);
}

function VendorActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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

function VendorsPage() {
	const { items, total, currencies } = Route.useLoaderData();
	const committed = Route.useSearch(); // matches the rows on screen
	const search = useLiveSearch(searchSchema); // matches the controls: updates instantly
	const navigate = Route.useNavigate();
	const router = useRouter();
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};
	const [editing, setEditing] = useState<Vendor | "new" | null>(null);
	const [deleting, setDeleting] = useState<Vendor | null>(null);

	const filtered = Boolean(search.q || search.locality);

	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });
	useClampPage({
		page: committed.page,
		pageSize: committed.pageSize,
		total,
		itemCount: items.length,
		setPage,
	});

	return (
		<>
			<PageHeader
				title="Vendors"
				description="Shops, people and companies you pay."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add vendor
					</Button>
				}
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={`${total} ${total === 1 ? "vendor" : "vendors"}`}
						filters={
							<>
								<SearchField
									value={search.q ?? ""}
									placeholder="Search name, contact, address"
									onChange={(q) =>
										navigate({ search: (p) => ({ ...p, page: 1, q: q || undefined }) })
									}
								/>
								<TextField
									select
									size="small"
									label="Type"
									value={search.locality ?? ""}
									onChange={(e) =>
										navigate({
											search: (p) => ({
												...p,
												page: 1,
												locality: (e.target.value || undefined) as VendorLocality | undefined,
											}),
										})
									}
									sx={{ minWidth: { sm: 150 } }}
								>
									<MenuItem value="">All types</MenuItem>
									{VENDOR_LOCALITIES.map((l) => (
										<MenuItem key={l} value={l}>
											{VENDOR_LOCALITY_LABELS[l]}
										</MenuItem>
									))}
								</TextField>
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
						<EmptyState firstRun={!filtered}>
							{filtered
								? "No vendors match these filters."
								: "No vendors yet. They're also created automatically when you name one on a transaction."}
						</EmptyState>
					) : (
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
										<VendorActions onEdit={() => setEditing(v)} onDelete={() => setDeleting(v)} />
									</TableCell>
								</TableRow>
							)}
							renderCard={(v) => (
								<MobileCard
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
										(v.is_local != null || v.address) && (
											<>
												<LocalChip vendor={v} />
												{v.address && (
													<Typography variant="caption" sx={{ color: "text.secondary" }}>
														{v.address}
													</Typography>
												)}
											</>
										)
									}
									actions={
										<VendorActions onEdit={() => setEditing(v)} onDelete={() => setDeleting(v)} />
									}
								/>
							)}
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
					onClose={() => setEditing(null)}
				/>
			)}
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
