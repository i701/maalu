import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import MobileCard from "#/components/MobileCard";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import TableCard from "#/components/TableCard";
import ResponsiveTable from "#/components/ResponsiveTable";
import SearchField from "#/components/SearchField";
import SubscriptionForm from "#/components/SubscriptionForm";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import { daysUntil, formatDate, formatInterval, formatMoney } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { pageSearch, useClampPage } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { listCurrenciesFn } from "#/server/currencies";
import {
	deleteSubscriptionFn,
	getSubscriptionSummaryFn,
	listSubscriptionsPageFn,
} from "#/server/subscriptions";
import { listVendorsFn } from "#/server/vendors";
import {
	INTERVAL_UNITS,
	INTERVAL_UNIT_LABELS,
	SUBSCRIPTION_STATUSES,
	SUBSCRIPTION_STATUS_LABELS,
	type IntervalUnit,
	type Subscription,
	type SubscriptionStatus,
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
		return {
			...unwrap(subscriptions),
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

const statusColor = { active: "success", paused: "warning", cancelled: "default" } as const;

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
		<Chip size="small" color={statusColor[s.status]} label={SUBSCRIPTION_STATUS_LABELS[s.status]} />
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

function SubscriptionsPage() {
	const { items, total, summary, vendors, currencies } = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const [editing, setEditing] = useState<Subscription | "new" | null>(null);
	const [deleting, setDeleting] = useState<Subscription | null>(null);
	const committed = Route.useSearch(); // matches the rows on screen
	const search = useLiveSearch(searchSchema); // matches the controls: updates instantly
	const navigate = Route.useNavigate();

	const filtered = Boolean(search.q || search.status || search.interval_unit);

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
				title="Subscriptions"
				description="Recurring charges. Link a transaction to a subscription to mark it paid."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add subscription
					</Button>
				}
			/>

			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card>
						<CardContent>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Monthly total
							</Typography>
							<Typography variant="h2" component="p" sx={{ mt: 0.5 }}>
								{formatMoney(summary.monthly_base_total, summary.currency)}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card>
						<CardContent>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Active subscriptions
							</Typography>
							<Typography variant="h2" component="p" sx={{ mt: 0.5 }}>
								{summary.active_count}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={`${total} ${total === 1 ? "subscription" : "subscriptions"}`}
						filters={
							<>
								<SearchField
									value={search.q ?? ""}
									placeholder="Search name, vendor, category"
									onChange={(q) =>
										navigate({ search: (p) => ({ ...p, page: 1, q: q || undefined }) })
									}
								/>
								<TextField
									select
									size="small"
									label="Status"
									value={search.status ?? ""}
									onChange={(e) =>
										navigate({
											search: (p) => ({
												...p,
												page: 1,
												status: (e.target.value || undefined) as SubscriptionStatus | undefined,
											}),
										})
									}
									sx={{ minWidth: { sm: 140 } }}
								>
									<MenuItem value="">All statuses</MenuItem>
									{SUBSCRIPTION_STATUSES.map((st) => (
										<MenuItem key={st} value={st}>
											{SUBSCRIPTION_STATUS_LABELS[st]}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Billing"
									value={search.interval_unit ?? ""}
									onChange={(e) =>
										navigate({
											search: (p) => ({
												...p,
												page: 1,
												interval_unit: (e.target.value || undefined) as IntervalUnit | undefined,
											}),
										})
									}
									sx={{ minWidth: { sm: 140 } }}
								>
									<MenuItem value="">Any period</MenuItem>
									{INTERVAL_UNITS.map((u) => (
										<MenuItem key={u} value={u}>
											{INTERVAL_UNIT_LABELS[u]}
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
								? "No subscriptions match these filters."
								: 'No subscriptions yet. Add one, or use "Make subscription" on a transaction.'}
						</EmptyState>
					) : (
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
										<SubCost s={s} baseCurrency={user.base_currency} />
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>
										<SubNextDue s={s} />
									</TableCell>
									<TableCell>
										<StatusChip s={s} />
									</TableCell>
									<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
										{formatMoney(s.monthly_base_cost, user.base_currency)}
									</TableCell>
									<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
										<SubActions onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
									</TableCell>
								</TableRow>
							)}
							renderCard={(s) => (
								<MobileCard
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
									end={<SubCost s={s} baseCurrency={user.base_currency} />}
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
												{formatMoney(s.monthly_base_cost, user.base_currency)} / month
											</Typography>
										</>
									}
									actions={
										<SubActions onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
									}
								/>
							)}
						/>
					)}

					<TablePager
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
