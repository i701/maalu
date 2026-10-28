import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TemplateRenameDialog from "#/components/TemplateRenameDialog";
import TonalChip from "#/components/TonalChip";
import { PAYMENT_ACCENT } from "#/lib/accents";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { deleteTemplateFn, listTemplatesPageFn } from "#/server/templates";
import {
	PAYMENT_METHOD_LABELS,
	TRANSACTION_TYPE_LABELS,
	type TransactionTemplate,
} from "#/types/api";

const searchSchema = z.object(pageSearch);

export const Route = createFileRoute("/_protected/templates")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const rows = unwrap(await listTemplatesPageFn({ data: deps }));
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last template of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/templates", search: { ...deps, page: last } });
		return rows;
	},
	component: TemplatesPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What choosing the template fills in, as small chips. */
function Fills({ template: t }: { template: TransactionTemplate }) {
	const where = t.to_account ? `${t.account?.name ?? "?"} → ${t.to_account.name}` : t.account?.name;
	return (
		<>
			<TonalChip accent={ACCENT.blue} label={TRANSACTION_TYPE_LABELS[t.type]} />
			{t.type !== "transfer" && (
				<TonalChip
					accent={PAYMENT_ACCENT[t.payment_method]}
					label={PAYMENT_METHOD_LABELS[t.payment_method]}
				/>
			)}
			{t.category && <TonalChip accent={ACCENT.pink} label={t.category} />}
			{t.vendor && <TonalChip accent={ACCENT.orange} label={t.vendor} />}
			{where && <TonalChip accent={ACCENT.green} label={where} />}
		</>
	);
}

const amount = (t: TransactionTemplate) => (t.amount ? formatMoney(t.amount, t.currency) : "Any");

function Actions({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
	return (
		<>
			<IconButton aria-label="Rename" title="Rename" size="small" onClick={onRename}>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

const TemplatesTable = memo(function TemplatesTable({
	items,
	onRename,
	onDelete,
}: {
	items: TransactionTemplate[];
	onRename: (t: TransactionTemplate) => void;
	onDelete: (t: TransactionTemplate) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(t) => t.id}
			minWidth={680}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Fills in</TableCell>
					<TableCell align="right">Amount</TableCell>
					<TableCell align="right" sx={{ width: 110 }} />
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow hover>
					<TableCell>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{t.name}
						</Typography>
					</TableCell>
					<TableCell sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", border: 0 }}>
						<Fills template={t} />
					</TableCell>
					<TableCell align="right">{amount(t)}</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions onRename={() => onRename(t)} onDelete={() => onDelete(t)} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(t) => (
				<MobileCard
					leading={
						<ShapeTile shape={5} size={52} accent={ACCENT.lime}>
							<Symbol name="bookmark" size={24} filled />
						</ShapeTile>
					}
					primary={
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{t.name}
						</Typography>
					}
					end={<Typography variant="body2">{amount(t)}</Typography>}
					meta={<Fills template={t} />}
					actions={<Actions onRename={() => onRename(t)} onDelete={() => onDelete(t)} />}
				/>
			)}
		/>
	);
});

function TemplatesPage() {
	const { items, total } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const [renaming, setRenaming] = useState<TransactionTemplate | null>(null);
	const [deleting, setDeleting] = useState<TransactionTemplate | null>(null);
	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= Math.ceil(total / search.pageSize))
			void router.preloadRoute({ to: Route.fullPath, search: (p) => ({ ...p, page }) });
	};

	return (
		<>
			<PageHeader
				title="Templates"
				symbol="bookmark"
				accent="lime"
				shape={5}
				stats={[{ symbol: "bookmark", label: plural(total, "template", "templates") }]}
				description="Saved starting points for the transactions you repeat. Pick one when you add a transaction."
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar summary={plural(total, "template", "templates")} />

					{items.length === 0 ? (
						<EmptyState firstRun symbol="bookmark" accent="lime" shape={5}>
							No templates yet. Fill in a transaction, such as your weekly shop, and choose Save as
							template.
						</EmptyState>
					) : (
						<TemplatesTable items={items} onRename={setRenaming} onDelete={setDeleting} />
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

			{renaming && <TemplateRenameDialog template={renaming} onClose={() => setRenaming(null)} />}
			{deleting && (
				<ConfirmDelete
					title="Delete template"
					message={`Delete the "${deleting.name}" template? Transactions you already added from it aren't affected.`}
					onConfirm={() => deleteTemplateFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
