import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import HistoryTable from "#/components/import/HistoryTable";
import ImportReview from "#/components/import/ImportReview";
import UploadCard from "#/components/import/UploadCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import { plural } from "#/lib/imports";
import { useLiveSearch } from "#/lib/live-search";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { listAccountsFn } from "#/server/accounts";
import { listCategoriesFn } from "#/server/categories";
import { listImportsPageFn, undoImportFn } from "#/server/imports";
import { listVendorsFn } from "#/server/vendors";
import type { ImportBatch, ImportPreview } from "#/types/api";

const searchSchema = z.object({ ...pageSearch });

export const Route = createFileRoute("/_protected/import")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ page: search.page, pageSize: search.pageSize }),
	loader: async ({ deps }) => {
		const [history, accounts, categories, vendors] = await Promise.all([
			listImportsPageFn({ data: deps }),
			listAccountsFn(),
			listCategoriesFn(),
			listVendorsFn(),
		]);
		const rows = unwrap(history);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		if (last) throw redirect({ to: "/import", search: { ...deps, page: last } });
		return {
			...rows,
			accounts: unwrap(accounts),
			categories: unwrap(categories),
			vendors: unwrap(vendors),
		};
	},
	component: ImportPage,
});

function ImportPage() {
	const { items, total, accounts, categories, vendors } = Route.useLoaderData();
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const router = useRouter();
	const [reading, setReading] = useState<{ preview: ImportPreview; filename: string } | null>(null);
	const [undoing, setUndoing] = useState<ImportBatch | null>(null);

	return (
		<>
			<PageHeader
				title="Import"
				symbol="upload_file"
				accent="orange"
				shape={3}
				stats={[{ symbol: "upload_file", label: plural(total, "import") }]}
				description="Bring in a bank statement (BML or MIB, as CSV). You review every row first, and every import comes with a report and can be undone."
			/>

			{reading ? (
				<ImportReview
					key={reading.filename}
					preview={reading.preview}
					filename={reading.filename}
					accounts={accounts}
					categories={categories}
					vendors={vendors}
					onClose={() => setReading(null)}
				/>
			) : (
				<UploadCard
					accounts={accounts}
					onPreview={(preview, filename) => setReading({ preview, filename })}
				/>
			)}

			<PendingOverlay>
				<TableCard sx={{ mt: 3 }}>
					<TableToolbar summary="Earlier imports" />
					{items.length === 0 ? (
						<EmptyState firstRun symbol="upload_file" accent="orange" shape={3}>
							Nothing imported yet. Choose a statement above to start.
						</EmptyState>
					) : (
						<HistoryTable items={items} onUndo={setUndoing} />
					)}
					<TablePager
						total={total}
						page={search.page}
						pageSize={search.pageSize}
						onPageChange={(page) => navigate({ search: (p) => ({ ...p, page }), replace: true })}
						onPageSizeChange={(pageSize) =>
							navigate({ search: (p) => ({ ...p, page: 1, pageSize }) })
						}
						onPrefetch={(page) => {
							if (page >= 1 && page <= Math.ceil(total / search.pageSize))
								void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
						}}
					/>
				</TableCard>
			</PendingOverlay>

			{undoing && (
				<ConfirmDelete
					title="Undo this import"
					message={`Move the ${plural(undoing.transaction_count, "transaction")} imported from ${undoing.filename} to the trash? You can restore them from the Trash page.`}
					confirmLabel="Undo import"
					doneMessage="Import undone"
					onConfirm={async () => {
						const res = await undoImportFn({ data: { id: undoing.id } });
						return res.ok ? { ok: true, data: undefined } : res;
					}}
					onClose={() => setUndoing(null)}
				/>
			)}
		</>
	);
}
