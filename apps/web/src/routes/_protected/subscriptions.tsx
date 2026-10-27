import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
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
import StatCard from "#/components/StatCard";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import SubscriptionForm from "#/components/SubscriptionForm";
import ChipFilter from "#/components/ChipFilter";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import TonalChip from "#/components/TonalChip";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import { daysUntil, formatDate, formatInterval, formatMoney } from "#/lib/format";
import { STATUS_ACCENT } from "#/lib/accents";
import { useLiveSearch } from "#/lib/live-search";
import { staggerChildren } from "#/lib/motion";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { listCurrenciesFn } from "#/server/currencies";
import {
	deleteSubscriptionFn,
	getSubscriptionSummaryFn,
	listSubscriptionsPageFn,
} from "#/server/subscriptions";
import { listVendorsFn } from "#/server/vendors";
import {
	INTERVAL_UNIT_LABELS,
	INTERVAL_UNITS,
	SUBSCRIPTION_STATUS_LABELS,
	SUBSCRIPTION_STATUSES,
	type Subscription,
} from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	status: z.enum(SUBSCRIPTION_STATUSES).optional().catch(undefined),
	interval_unit: z.enum(INTERVAL_UNITS).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/subscriptions")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [subscriptions, summary, vendors, currencies] = await Promise.all([
			listSubscriptionsPageFn({ data: deps }),
			getSubscriptionSummaryFn(),
			listVendorsFn(), // every vendor, for the form's picker
			listCurrenciesFn(),
		]);
		const rows = unwrap(subscriptions);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last) throw redirect({ to: "/subscriptions", search: { ...deps, page: last } });
		return {
			...rows,
			summary: unwrap(summary),
			vendors: unwrap(vendors),
			currencies,
		};
	},
	component: SubscriptionsPage,
});

const dash = (
	<Typography component="span" sx={{ color: "text.disabled" }}>
		—
	</Typography>
);

function DueChip({ sub }: { sub: Subscription }) {
	if (!sub.next_due_date) return dash;
	const days = daysUntil(sub.next_due_date);
	if (sub.is_overdue) {
		return <Chip size="small" color="error" label={`Overdue by ${Math.abs(days)}d`} />;
	}
	if (days === 0) return <Chip size="small" color="warning" label="Due today" />;
	if (days <= 7) return <Chip size="small" color="warning" label={`Due in ${days}d`} />;
	return <Chip size="small" variant="outlined" label={`In ${days}d`} />;
}

/** Pieces shared by the desktop row and the mobile card. */
function SubCost({ s, baseCurrency }: { s: Subscription; baseCurrency: string }) {
	return (
		<>
			<Typography variant="body2">
				{formatMoney(s.amount, s.currency)}{" "}
				<Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
					{formatInterval(s.interval_unit, s.interval_count)}
				</Typography>
			</Typography>
			{s.currency !== baseCurrency && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
					≈ {formatMoney(s.base_amount, baseCurrency)} @ {Number(s.exchange_rate)}
				</Typography>
			)}
		</>
	);
}

function SubNextDue({ s }: { s: Subscription }) {
	if (!s.next_due_date) return dash;
	return (
		<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
			<Typography variant="body2">{formatDate(s.next_due_date)}</Typography>
			<DueChip sub={s} />
		</Stack>
	);
}

function StatusChip({ s }: { s: Subscription }) {
	return (
		<TonalChip accent={STATUS_ACCENT[s.status]} label={SUBSCRIPTION_STATUS_LABELS[s.status]} />
	);
}

function SubActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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

/** The results table, memoised so it only re-renders when the loaded rows change, not on every
 * keystroke in the filter controls. */
const SubscriptionsTable = memo(function SubscriptionsTable({
	items,
	baseCurrency,
	onEdit,
	onDelete,
}: {
	items: Subscription[];
	baseCurrency: string;
	onEdit: (row: Subscription) => void;
	onDelete: (row: Subscription) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(s) => s.id}
			minWidth={860}
			head={
				<TableRow>
					<TableCell>Name</TableCell>
					<TableCell>Cost</TableCell>
					<TableCell>Next due</TableCell>
					<TableCell>Status</TableCell>
					<TableCell align="right">Per month</TableCell>
					<TableCell align="right" sx={{ width: 100 }} />
				</TableRow>
			}
			renderRow={(s) => (
				<TableRow hover>
					<TableCell>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{s.name}
						</Typography>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{[s.vendor?.name, s.category].filter(Boolean).join(" · ")}
						</Typography>
					</TableCell>
					<TableCell sx={{ whiteSpace: "nowrap" }}>
						<SubCost s={s} baseCurrency={baseCurrency} />
					</TableCell>
					<TableCell sx={{ whiteSpace: "nowrap" }}>
						<SubNextDue s={s} />
					</TableCell>
					<TableCell>
						<StatusChip s={s} />
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						{formatMoney(s.monthly_base_cost, baseCurrency)}
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<SubActions onEdit={() => onEdit(s)} onDelete={() => onDelete(s)} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(s) => (
				<MobileCard
					leading={
						<ShapeTile shape={2} size={52} accent={STATUS_ACCENT[s.status]}>
							<Symbol name="event_repeat" size={24} filled />
						</ShapeTile>
					}
					primary={
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{s.name}
						</Typography>
					}
					secondary={
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{[s.vendor?.name, s.category].filter(Boolean).join(" · ")}
						</Typography>
					}
					end={<SubCost s={s} baseCurrency={baseCurrency} />}
					meta={
						<>
							<StatusChip s={s} />
							{s.next_due_date && (
								<>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										Next {formatDate(s.next_due_date)}
									</Typography>
									<DueChip sub={s} />
								</>
							)}
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{formatMoney(s.monthly_base_cost, baseCurrency)} / month
							</Typography>
						</>
					}
					actions={<SubActions onEdit={() => onEdit(s)} onDelete={() => onDelete(s)} />}
				/>
			)}
		/>
	);
});

function SubscriptionsPage() {
	const { items, total, summary, vendors, currencies } = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const [editing, setEditing] = useState<Subscription | "new" | null>(null);
	const [deleting, setDeleting] = useState<Subscription | null>(null);
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

	const filtered = Boolean(search.q || search.status || search.interval_unit);

	const setPage = (page: number) => navigate({ search: (p) => ({ ...p, page }), replace: true });

	return (
		<>
			<PageHeader
				title="Subscriptions"
				symbol="event_repeat"
				accent="violet"
				shape={2}
				stats={[
					{ symbol: "event_repeat", label: `${summary.active_count} active` },
					{
						symbol: "payments",
						label: `${formatMoney(summary.monthly_base_total, summary.currency)} / month`,
					},
				]}
				description="Recurring charges. Link a transaction to a subscription to mark it paid."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add subscription
					</Button>
				}
			/>

			<Grid container spacing={2} sx={{ mb: 3, ...staggerChildren() }}>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<StatCard
						label="Monthly total"
						value={formatMoney(summary.monthly_base_total, summary.currency)}
						gradient="violet"
						icon="payments"
						shape={2}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<StatCard
						label="Active subscriptions"
						value={String(summary.active_count)}
						tone="primary"
						icon="event_repeat"
						shape={5}
					/>
				</Grid>
			</Grid>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						chips={
							<>
								<ChipFilter
									allLabel="All statuses"
									value={search.status}
									options={SUBSCRIPTION_STATUSES.map((v) => ({
										value: v,
										label: SUBSCRIPTION_STATUS_LABELS[v],
										accent: STATUS_ACCENT[v],
									}))}
									onChange={(status) => navigate({ search: (p) => ({ ...p, page: 1, status }) })}
								/>
								<ChipFilter
									allLabel="Any period"
									value={search.interval_unit}
									options={INTERVAL_UNITS.map((v) => ({
										value: v,
										label: INTERVAL_UNIT_LABELS[v],
									}))}
									onChange={(interval_unit) =>
										navigate({ search: (p) => ({ ...p, page: 1, interval_unit }) })
									}
								/>
							</>
						}
						summary={`${total} ${total === 1 ? "subscription" : "subscriptions"}`}
						filters={
							<>
								<SearchField
									value={search.q ?? ""}
									placeholder="Search name, vendor, category"
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

					{items.length === 0 ? (
						<EmptyState
							firstRun={!filtered}
							symbol={filtered ? "search" : "event_repeat"}
							accent={filtered ? "slate" : "violet"}
							shape={2}
						>
							{filtered
								? "No subscriptions match these filters."
								: 'No subscriptions yet. Add one, or use "Make subscription" on a transaction.'}
						</EmptyState>
					) : (
						<SubscriptionsTable
							items={items}
							baseCurrency={user.base_currency}
							onEdit={setEditing}
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
				<SubscriptionForm
					subscription={editing === "new" ? undefined : editing}
					vendors={vendors}
					currencies={currencies}
					baseCurrency={user.base_currency}
					onClose={() => setEditing(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete subscription"
					message={`Delete "${deleting.name}"? Its transactions are kept and just lose the subscription link.`}
					onConfirm={() => deleteSubscriptionFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
